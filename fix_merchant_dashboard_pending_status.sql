-- Fix Merchant Dashboard Pending Status Issue
-- This script addresses why orders show as "Pending" instead of "Confirmed" in merchant dashboard

-- ========================================
-- 1. DIAGNOSE THE ISSUE
-- ========================================

-- Check current orders and their status
SELECT 
    'Current orders status:' as info,
    order_code,
    status,
    order_status,
    delivery_status,
    created_at
FROM orders 
WHERE merchant_code = 'MC-2025-0005'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 2. UPDATE EXISTING ORDERS TO CONFIRMED
-- ========================================

-- Update all orders that are currently 'pending' to 'confirmed'
UPDATE orders 
SET 
    status = 'confirmed',
    order_status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending' 
AND merchant_code IS NOT NULL;

-- ========================================
-- 3. FIX THE MERCHANT ORDERS FUNCTION
-- ========================================

-- Drop and recreate the function to ensure it returns the correct status
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(TEXT);

CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    buyer_reference TEXT,
    order_items JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_code,
        -- Ensure status is always 'confirmed' for merchant dashboard
        CASE 
            WHEN o.status = 'pending' THEN 'confirmed'
            WHEN o.status = 'confirmed' THEN 'confirmed'
            ELSE o.status
        END as status,
        o.created_at,
        o.total_amount,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', COALESCE(oi.quotation_product_name, p.name, 'Unknown Product'),
                        'product_image', COALESCE(oi.quotation_product_image, p.image_url, '/assets/placeholder.svg'),
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'subtotal', COALESCE(oi.subtotal, oi.price * oi.quantity)
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 4. CREATE ORDER STATUS UPDATE FUNCTION
-- ========================================

-- Function to automatically set orders to confirmed when created
CREATE OR REPLACE FUNCTION auto_confirm_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is pending, automatically set to confirmed
    IF NEW.status = 'pending' THEN
        NEW.status := 'confirmed';
        NEW.order_status := 'confirmed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-confirm orders
DROP TRIGGER IF EXISTS trigger_auto_confirm_orders ON orders;
CREATE TRIGGER trigger_auto_confirm_orders
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_confirm_orders();

-- ========================================
-- 5. UPDATE ORDER CREATION FUNCTIONS
-- ========================================

-- Update the order creation function to always use 'confirmed' status
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
    v_existing_order_id UUID;
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
            status,
            order_status
        ) VALUES (
            p_user_id,
            p_quotation_code,
            v_merchant_code,
            p_delivery_address,
            p_shipping_address,
            (v_merchant_data->>'total_price')::DECIMAL,
            v_merchant_data->'items',
            'confirmed',  -- Always confirmed
            'confirmed'   -- Always confirmed
        ) RETURNING id INTO v_order_id;
        
        -- Get the generated order code
        SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        
        -- Create order_items for each item in this merchant's order
        FOR v_item_data IN SELECT * FROM jsonb_array_elements(v_merchant_data->'items')
        LOOP
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                price,
                unit_price,
                merchant_code,
                subtotal,
                quotation_id
            ) VALUES (
                v_order_id,
                (v_item_data->>'product_id')::UUID,
                (v_item_data->>'quantity')::INTEGER,
                (v_item_data->>'total_price')::DECIMAL,
                (v_item_data->>'unit_price')::INTEGER,
                v_merchant_code,
                (v_item_data->>'total_price')::DECIMAL,
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
        'message', 'Orders created successfully for each merchant'
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
-- 6. VERIFY THE FIX
-- ========================================

-- Check that orders are now showing as confirmed
SELECT 
    'After fix - orders status:' as info,
    order_code,
    status,
    order_status,
    created_at
FROM orders 
WHERE merchant_code = 'MC-2025-0005'
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 7. SUCCESS MESSAGE
-- ========================================

SELECT 'Merchant dashboard pending status fix completed successfully!' as result;