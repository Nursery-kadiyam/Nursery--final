-- Fix Price Calculation Issue
-- This script addresses the incorrect price calculation in order items
-- The issue is that unit_price is not being properly set, causing incorrect calculations

-- ========================================
-- 1. DIAGNOSE THE ISSUE
-- ========================================

-- Check current order_items with missing or incorrect unit_price
SELECT 
    'Current order_items with price issues:' as info,
    oi.id,
    oi.order_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    oi.subtotal,
    o.order_code,
    o.quotation_code
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.unit_price IS NULL 
   OR oi.unit_price = 0
   OR (oi.unit_price * oi.quantity) != oi.price
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 2. FIX EXISTING ORDER_ITEMS
-- ========================================

-- Update order_items with correct unit_price calculations
UPDATE order_items 
SET 
    unit_price = CASE 
        WHEN quantity > 0 THEN (price / quantity)::integer
        ELSE 0
    END,
    subtotal = price
WHERE unit_price IS NULL 
   OR unit_price = 0
   OR (unit_price * quantity) != price;

-- ========================================
-- 3. ENHANCE UNIT_PRICE EXTRACTION FUNCTION
-- ========================================

-- Create enhanced function to extract unit price from quotations
CREATE OR REPLACE FUNCTION extract_unit_price_from_quotation(
    p_quotation_code TEXT,
    p_item_index INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_unit_price INTEGER;
    v_unit_prices JSONB;
    v_item_prices JSONB;
BEGIN
    -- Get unit_prices from quotation
    SELECT unit_prices INTO v_unit_prices
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF v_unit_prices IS NOT NULL THEN
        -- Extract unit price for the specific item index
        v_unit_price := (v_unit_prices->>p_item_index)::integer;
        
        -- If still null, try to get from items array
        IF v_unit_price IS NULL THEN
            SELECT items INTO v_item_prices
            FROM quotations 
            WHERE quotation_code = p_quotation_code;
            
            IF v_item_prices IS NOT NULL THEN
                v_unit_price := (v_item_prices->p_item_index->>'unit_price')::integer;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(v_unit_price, 0);
END;
$$;

-- ========================================
-- 4. UPDATE ORDER_ITEMS WITH QUOTATION PRICES
-- ========================================

-- Update order_items with unit_price from quotations
UPDATE order_items 
SET unit_price = (
    SELECT 
        CASE 
            WHEN q.unit_prices IS NOT NULL THEN
                -- Try to get unit price from unit_prices array
                COALESCE(
                    (q.unit_prices::jsonb->>0)::integer,
                    (q.unit_prices::jsonb->>1)::integer,
                    (q.unit_prices::jsonb->>2)::integer,
                    (oi.price / oi.quantity)::integer
                )
            ELSE 
                -- Fallback: calculate unit price from total price and quantity
                (oi.price / oi.quantity)::integer
        END
    FROM orders o
    JOIN quotations q ON o.quotation_code = q.quotation_code
    WHERE o.id = order_items.order_id
    AND o.quotation_code IS NOT NULL
)
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.id = order_items.order_id 
    AND o.quotation_code IS NOT NULL
)
AND (unit_price IS NULL OR unit_price = 0);

-- ========================================
-- 5. UPDATE SUBTOTAL CALCULATIONS
-- ========================================

-- Update subtotal to ensure it matches unit_price * quantity
UPDATE order_items 
SET subtotal = unit_price * quantity
WHERE unit_price IS NOT NULL 
  AND unit_price > 0
  AND quantity > 0;

-- ========================================
-- 6. ENHANCE TRIGGER FOR FUTURE ORDERS
-- ========================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_unit_price_trigger ON order_items;

-- Enhanced function to handle unit_price calculation
CREATE OR REPLACE FUNCTION update_unit_price()
RETURNS TRIGGER AS $$
DECLARE
    v_quotation_code TEXT;
    v_unit_price INTEGER;
    v_unit_prices JSONB;
BEGIN
    -- Only set unit_price if it's NULL or 0
    IF NEW.unit_price IS NULL OR NEW.unit_price = 0 THEN
        -- Check if this order is from a quotation
        SELECT quotation_code INTO v_quotation_code
        FROM orders 
        WHERE id = NEW.order_id;
        
        IF v_quotation_code IS NOT NULL THEN
            -- Try to get unit_price from quotation
            v_unit_price := extract_unit_price_from_quotation(v_quotation_code, 0);
            
            IF v_unit_price > 0 THEN
                NEW.unit_price := v_unit_price;
            ELSE
                -- Fallback: calculate from price and quantity
                NEW.unit_price := (NEW.price / NEW.quantity)::integer;
            END IF;
        ELSE
            -- For non-quotation orders, calculate from price and quantity
            NEW.unit_price := (NEW.price / NEW.quantity)::integer;
        END IF;
    END IF;
    
    -- Ensure subtotal is calculated correctly
    IF NEW.subtotal IS NULL OR NEW.subtotal = 0 THEN
        NEW.subtotal := NEW.unit_price * NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_unit_price_trigger 
    BEFORE INSERT OR UPDATE ON order_items 
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_price();

-- ========================================
-- 7. UPDATE ORDER CREATION FUNCTIONS
-- ========================================

-- Update the order creation function to ensure proper unit_price
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
        
        -- Create order with 'confirmed' status
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
            (v_merchant_data->>'total_price')::DECIMAL,
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
                extract_unit_price_from_quotation(p_quotation_code, 0),
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
        v_total_amount := v_total_amount + (v_merchant_data->>'total_price')::DECIMAL;
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
-- 8. VERIFY THE FIX
-- ========================================

-- Check that price calculations are now correct
SELECT 
    'Fixed order_items with correct calculations:' as info,
    oi.id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.price,
    o.order_code,
    CASE 
        WHEN oi.unit_price * oi.quantity = oi.price THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as calculation_status
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.unit_price IS NOT NULL 
  AND oi.unit_price > 0
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 9. SUCCESS MESSAGE
-- ========================================

SELECT 'Price calculation fix completed successfully!' as result;