-- Remove Pending Status Completely from Entire App
-- This script ensures all orders are automatically confirmed when placed
-- No more "Pending" status anywhere in the system

-- ========================================
-- 1. UPDATE ALL EXISTING PENDING ORDERS
-- ========================================

-- Update all existing pending orders to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    order_status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending' OR order_status = 'pending';

-- ========================================
-- 2. UPDATE ORDERS TABLE CONSTRAINT
-- ========================================

-- Drop existing constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint that doesn't allow 'pending' status
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'confirmed', 
    'shipped', 
    'delivered', 
    'cancelled',
    'processing',
    'ready_for_shipment',
    'out_for_delivery',
    'completed',
    'refunded',
    'returned'
));

-- ========================================
-- 3. UPDATE ORDER CREATION FUNCTIONS
-- ========================================

-- Update the main order creation function
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
        
        -- Create order with 'confirmed' status (NO PENDING)
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
            'confirmed',  -- ALWAYS CONFIRMED
            'confirmed'   -- ALWAYS CONFIRMED
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

-- Update simple order creation function
CREATE OR REPLACE FUNCTION create_or_update_simple_order(
    p_user_id UUID,
    p_delivery_address JSONB,
    p_cart_items JSONB,
    p_total_amount DECIMAL,
    p_quotation_code TEXT DEFAULT NULL,
    p_merchant_code TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_result JSONB;
BEGIN
    -- Create order with 'confirmed' status (NO PENDING)
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
        p_merchant_code,
        p_delivery_address,
        COALESCE(p_delivery_address->>'address', 'Address not provided'),
        p_total_amount,
        p_cart_items,
        'confirmed',  -- ALWAYS CONFIRMED
        'confirmed'   -- ALWAYS CONFIRMED
    ) RETURNING id INTO v_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order created and confirmed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create order: ' || SQLERRM
        );
END;
$$;

-- ========================================
-- 4. UPDATE MERCHANT ORDERS FUNCTION
-- ========================================

-- Update merchant orders function to never return pending
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
        -- NEVER return pending - always confirmed or higher
        CASE 
            WHEN o.status = 'pending' THEN 'confirmed'
            WHEN o.status IS NULL THEN 'confirmed'
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

-- ========================================
-- 5. CREATE AUTO-CONFIRM TRIGGER
-- ========================================

-- Function to automatically confirm all orders
CREATE OR REPLACE FUNCTION auto_confirm_all_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- Force all orders to be confirmed
    NEW.status := 'confirmed';
    NEW.order_status := 'confirmed';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-confirm all orders
DROP TRIGGER IF EXISTS trigger_auto_confirm_all_orders ON orders;
CREATE TRIGGER trigger_auto_confirm_all_orders
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_confirm_all_orders();

-- ========================================
-- 6. UPDATE QUOTATIONS STATUS
-- ========================================

-- Update quotations to use confirmed status instead of pending
UPDATE quotations 
SET status = 'confirmed'
WHERE status = 'pending';

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION create_or_update_order_from_quotations TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_simple_order TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 8. VERIFY THE FIX
-- ========================================

-- Check that no pending orders exist
SELECT 
    'Orders status after fix:' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- ========================================
-- 9. SUCCESS MESSAGE
-- ========================================

SELECT 'Pending status completely removed from entire app!' as result;