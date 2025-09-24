-- Fix Total Amount Calculation Issue
-- This script addresses the incorrect total amount calculation in orders
-- The issue is that order.total_amount doesn't match the sum of order_items

-- ========================================
-- 1. DIAGNOSE THE ISSUE
-- ========================================

-- Check orders where total_amount doesn't match sum of order_items
SELECT 
    'Orders with incorrect total_amount:' as info,
    o.id,
    o.order_code,
    o.total_amount as order_total,
    SUM(oi.price) as calculated_total,
    o.total_amount - SUM(oi.price) as difference,
    o.created_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.total_amount, o.created_at
HAVING o.total_amount != SUM(oi.price)
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 2. FIX EXISTING ORDERS
-- ========================================

-- Update orders with correct total_amount
UPDATE orders 
SET total_amount = (
    SELECT SUM(oi.price) 
    FROM order_items oi 
    WHERE oi.order_id = orders.id
)
WHERE EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.order_id = orders.id
);

-- ========================================
-- 3. FIX ORDER_ITEMS PRICE CALCULATIONS
-- ========================================

-- Update order_items with correct price calculations
UPDATE order_items 
SET 
    price = unit_price * quantity,
    subtotal = unit_price * quantity
WHERE unit_price IS NOT NULL 
  AND unit_price > 0
  AND quantity > 0;

-- ========================================
-- 4. RECALCULATE ORDER TOTALS
-- ========================================

-- Recalculate total_amount for all orders
UPDATE orders 
SET total_amount = (
    SELECT COALESCE(SUM(oi.price), 0)
    FROM order_items oi 
    WHERE oi.order_id = orders.id
)
WHERE EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.order_id = orders.id
);

-- ========================================
-- 5. ENHANCE ORDER CREATION FUNCTIONS
-- ========================================

-- Update the order creation function to ensure correct total calculation
CREATE OR REPLACE FUNCTION create_or_update_order_from_quotations(
    p_user_id UUID,
    p_quotation_code TEXT,
    p_selected_merchants JSONB,
    p_delivery_address JSONB,
    p_shipping_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_merchant_code TEXT;
    v_merchant_data JSONB;
    v_item_data JSONB;
    v_total_amount DECIMAL(10,2) := 0;
    v_result JSONB;
    v_quotation RECORD;
    v_order_ids UUID[] := '{}';
    v_order_codes TEXT[] := '{}';
    v_order_code TEXT;
    v_order_item_id UUID;
    v_unit_price INTEGER;
    v_calculated_total DECIMAL(10,2) := 0;
BEGIN
    -- Get the original quotation
    SELECT * INTO v_quotation 
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Quotation not found'
        );
    END IF;
    
    -- Delete existing orders for this quotation and user to avoid conflicts
    DELETE FROM order_items 
    WHERE order_id IN (
        SELECT id FROM orders 
        WHERE quotation_code = p_quotation_code 
        AND user_id = p_user_id
    );
    
    DELETE FROM orders 
    WHERE quotation_code = p_quotation_code 
    AND user_id = p_user_id;
    
    -- Process each selected merchant - create ONE order per merchant
    FOR v_merchant_data IN SELECT * FROM jsonb_array_elements(p_selected_merchants)
    LOOP
        v_merchant_code := v_merchant_data->>'merchant_code';
        v_calculated_total := 0;
        
        -- Calculate total from items first
        FOR v_item_data IN SELECT * FROM jsonb_array_elements(v_merchant_data->'items')
        LOOP
            v_calculated_total := v_calculated_total + (v_item_data->>'total_price')::DECIMAL;
        END LOOP;
        
        -- Create order with calculated total
        INSERT INTO orders (
            user_id,
            quotation_code,
            merchant_code,
            delivery_address,
            shipping_address,
            total_amount,
            cart_items,
            status
        ) VALUES (
            p_user_id,
            p_quotation_code,
            v_merchant_code,
            p_delivery_address,
            p_shipping_address,
            v_calculated_total,  -- Use calculated total
            v_merchant_data->'items',
            'confirmed'
        ) RETURNING id INTO v_order_id;
        
        -- Get the generated order code
        SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        
        -- Create order_items for each item in this merchant's order
        FOR v_item_data IN SELECT * FROM jsonb_array_elements(v_merchant_data->'items')
        LOOP
            -- Calculate unit price from quotation or use provided unit_price
            v_unit_price := COALESCE(
                (v_item_data->>'unit_price')::integer,
                (v_item_data->>'total_price')::integer / (v_item_data->>'quantity')::integer
            );
            
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                price,
                unit_price,
                subtotal,
                merchant_code,
                quotation_id
            ) VALUES (
                v_order_id,
                (v_item_data->>'product_id')::UUID,
                (v_item_data->>'quantity')::INTEGER,
                (v_item_data->>'total_price')::DECIMAL,
                v_unit_price,
                v_unit_price * (v_item_data->>'quantity')::INTEGER,
                v_merchant_code,
                v_quotation.id
            ) RETURNING id INTO v_order_item_id;
        END LOOP;
        
        -- Add to results
        v_order_ids := array_append(v_order_ids, v_order_id);
        v_order_codes := array_append(v_order_codes, v_order_code);
        v_total_amount := v_total_amount + v_calculated_total;
    END LOOP;
    
    -- Mark quotation as order placed
    UPDATE quotations 
    SET order_placed_at = NOW() 
    WHERE quotation_code = p_quotation_code;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_ids', v_order_ids,
        'order_codes', v_order_codes,
        'total_amount', v_total_amount,
        'message', 'Orders created and confirmed successfully for each merchant'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create orders: ' || SQLERRM
        );
END;
$$;

-- ========================================
-- 6. CREATE TRIGGER TO AUTO-UPDATE TOTALS
-- ========================================

-- Function to automatically update order total when order_items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_new_total DECIMAL(10,2);
BEGIN
    -- Get the order_id
    IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.order_id;
    ELSE
        v_order_id := NEW.order_id;
    END IF;
    
    -- Calculate new total
    SELECT COALESCE(SUM(price), 0) INTO v_new_total
    FROM order_items 
    WHERE order_id = v_order_id;
    
    -- Update the order total
    UPDATE orders 
    SET total_amount = v_new_total
    WHERE id = v_order_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update order totals
DROP TRIGGER IF EXISTS trigger_update_order_total ON order_items;
CREATE TRIGGER trigger_update_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- ========================================
-- 7. VERIFY THE FIX
-- ========================================

-- Check that total amounts are now correct
SELECT 
    'Fixed orders with correct totals:' as info,
    o.id,
    o.order_code,
    o.total_amount as order_total,
    SUM(oi.price) as calculated_total,
    CASE 
        WHEN o.total_amount = SUM(oi.price) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as calculation_status
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.total_amount
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 8. SUCCESS MESSAGE
-- ========================================

SELECT 'Total amount calculation fix completed successfully!' as result;