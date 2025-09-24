-- Fix New Order Merchant Linking
-- This script fixes the issue where new orders are not properly linked to merchants

-- ========================================
-- 1. UPDATE ORDER CREATION FUNCTION
-- ========================================

-- Create an improved order creation function that properly links to merchants
CREATE OR REPLACE FUNCTION create_or_update_simple_order(
    p_user_id UUID,
    p_delivery_address JSONB,
    p_cart_items JSONB,
    p_total_amount NUMERIC,
    p_quotation_code TEXT DEFAULT NULL,
    p_merchant_code TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_code TEXT;
    v_item_data JSONB;
    v_order_item_id UUID;
    v_existing_order_id UUID;
    v_actual_merchant_code TEXT;
    v_quotation_merchant_code TEXT;
BEGIN
    -- Determine the actual merchant code from quotation if available
    IF p_quotation_code IS NOT NULL THEN
        -- Get merchant code from quotation
        SELECT merchant_code INTO v_quotation_merchant_code
        FROM quotations 
        WHERE quotation_code = p_quotation_code 
        LIMIT 1;
        
        -- Use quotation merchant code if found, otherwise use provided merchant code
        v_actual_merchant_code := COALESCE(v_quotation_merchant_code, p_merchant_code);
    ELSE
        v_actual_merchant_code := p_merchant_code;
    END IF;
    
    -- Check if an order already exists for this quotation and user
    IF p_quotation_code IS NOT NULL THEN
        SELECT id INTO v_existing_order_id
        FROM orders 
        WHERE quotation_code = p_quotation_code 
        AND user_id = p_user_id
        AND status NOT IN ('cancelled', 'refunded')
        LIMIT 1;
        
        -- If order exists, update it instead of creating a new one
        IF v_existing_order_id IS NOT NULL THEN
            -- Delete existing order items
            DELETE FROM order_items WHERE order_id = v_existing_order_id;
            
            -- Update the existing order
            UPDATE orders SET
                delivery_address = p_delivery_address,
                cart_items = p_cart_items,
                total_amount = p_total_amount,
                merchant_code = v_actual_merchant_code, -- Use actual merchant code
                status = 'confirmed',
                updated_at = NOW()
            WHERE id = v_existing_order_id
            RETURNING id INTO v_order_id;
            
            -- Get the order code
            SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        ELSE
            -- Create new order
            INSERT INTO orders (
                user_id,
                delivery_address,
                cart_items,
                total_amount,
                quotation_code,
                merchant_code,
                status
            ) VALUES (
                p_user_id,
                p_delivery_address,
                p_cart_items,
                p_total_amount,
                p_quotation_code,
                v_actual_merchant_code, -- Use actual merchant code
                'confirmed'
            ) RETURNING id INTO v_order_id;
            
            -- Get the order code
            SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        END IF;
    ELSE
        -- Create new order for non-quotation orders
        INSERT INTO orders (
            user_id,
            delivery_address,
            cart_items,
            total_amount,
            merchant_code,
            status
        ) VALUES (
            p_user_id,
            p_delivery_address,
            p_cart_items,
            p_total_amount,
            v_actual_merchant_code, -- Use actual merchant code
            'confirmed'
        ) RETURNING id INTO v_order_id;
        
        -- Get the order code
        SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
    END IF;
    
    -- Create order_items for each item in the cart
    FOR v_item_data IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            unit_price
        ) VALUES (
            v_order_id,
            (v_item_data->>'id')::UUID,
            (v_item_data->>'quantity')::INTEGER,
            (v_item_data->>'price')::DECIMAL,
            (v_item_data->>'unit_price')::INTEGER
        ) RETURNING id INTO v_order_item_id;
    END LOOP;
    
    -- Return success with order details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order created/updated successfully',
        'order_id', v_order_id,
        'order_code', v_order_code,
        'merchant_code', v_actual_merchant_code,
        'updated', v_existing_order_id IS NOT NULL
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create/update order: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_or_update_simple_order TO authenticated;

-- ========================================
-- 2. UPDATE QUOTATION ORDER FUNCTION
-- ========================================

-- Create an improved quotation order function that properly handles merchant codes
CREATE OR REPLACE FUNCTION create_order_from_quotations(
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
    v_order_code TEXT;
    v_merchant_data JSONB;
    v_total_amount NUMERIC := 0;
    v_order_ids UUID[] := '{}';
    v_merchant_code TEXT;
BEGIN
    -- Create parent order first
    INSERT INTO orders (
        user_id,
        delivery_address,
        shipping_address,
        quotation_code,
        status,
        parent_order_id,
        merchant_code
    ) VALUES (
        p_user_id,
        p_delivery_address,
        p_shipping_address,
        p_quotation_code,
        'confirmed',
        NULL,
        'admin' -- Parent order has admin as merchant
    ) RETURNING id INTO v_order_id;
    
    -- Get the order code
    SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
    
    -- Process each selected merchant
    FOR v_merchant_data IN SELECT * FROM jsonb_array_elements(p_selected_merchants)
    LOOP
        v_merchant_code := v_merchant_data->>'merchant_code';
        
        -- Create child order for each merchant
        INSERT INTO orders (
            user_id,
            delivery_address,
            shipping_address,
            quotation_code,
            merchant_code,
            cart_items,
            total_amount,
            status,
            parent_order_id
        ) VALUES (
            p_user_id,
            p_delivery_address,
            p_shipping_address,
            p_quotation_code,
            v_merchant_code, -- Use actual merchant code
            v_merchant_data->'items',
            (v_merchant_data->>'total_amount')::NUMERIC,
            'confirmed',
            v_order_id
        ) RETURNING id INTO v_order_id;
        
        v_order_ids := array_append(v_order_ids, v_order_id);
        v_total_amount := v_total_amount + (v_merchant_data->>'total_amount')::NUMERIC;
    END LOOP;
    
    -- Update parent order with total amount
    UPDATE orders 
    SET total_amount = v_total_amount
    WHERE id = (SELECT id FROM orders WHERE quotation_code = p_quotation_code AND parent_order_id IS NULL LIMIT 1);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Orders created successfully',
        'order_ids', v_order_ids,
        'total_amount', v_total_amount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create orders: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_order_from_quotations TO authenticated;

-- ========================================
-- 3. FIX EXISTING ORDERS WITH WRONG MERCHANT CODES
-- ========================================

-- Update existing orders that have 'admin' as merchant_code to use actual merchant codes
UPDATE orders 
SET merchant_code = (
    SELECT q.merchant_code 
    FROM quotations q 
    WHERE q.quotation_code = orders.quotation_code 
    LIMIT 1
)
WHERE orders.merchant_code = 'admin' 
AND orders.quotation_code IS NOT NULL
AND EXISTS (
    SELECT 1 FROM quotations q 
    WHERE q.quotation_code = orders.quotation_code
);

-- ========================================
-- 4. VERIFY THE FIX
-- ========================================

-- Check orders with their merchant codes
SELECT 
    'ORDERS WITH MERCHANT CODES' as info,
    merchant_code,
    COUNT(*) as count
FROM orders 
GROUP BY merchant_code
ORDER BY merchant_code;

-- Check orders linked to quotations
SELECT 
    'ORDERS LINKED TO QUOTATIONS' as info,
    o.order_code,
    o.merchant_code,
    q.merchant_code as quotation_merchant_code,
    o.status
FROM orders o
LEFT JOIN quotations q ON q.quotation_code = o.quotation_code
WHERE o.quotation_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;