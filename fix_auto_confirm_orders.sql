-- Fix Auto-Confirm Orders - Remove Pending Status
-- This script changes the default order status to 'confirmed' and removes pending status

-- ========================================
-- 1. UPDATE ORDERS TABLE DEFAULT STATUS
-- ========================================

-- Change the default status from 'pending' to 'confirmed'
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- Update the status constraint to remove 'pending' and 'pending_payment'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- ========================================
-- 2. UPDATE EXISTING PENDING ORDERS
-- ========================================

-- Update all existing pending orders to confirmed
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status IN ('pending', 'pending_payment');

-- ========================================
-- 3. UPDATE ORDER PLACEMENT FUNCTIONS
-- ========================================

-- Update the simple order function to always set confirmed status
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
BEGIN
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
                merchant_code = p_merchant_code,
                status = 'confirmed', -- Always set to confirmed
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
                p_merchant_code,
                'confirmed' -- Always set to confirmed
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
            p_merchant_code,
            'confirmed' -- Always set to confirmed
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
-- 4. UPDATE QUOTATION ORDER FUNCTION
-- ========================================

-- Update the quotation order function to also set confirmed status
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
BEGIN
    -- Create parent order first
    INSERT INTO orders (
        user_id,
        delivery_address,
        shipping_address,
        quotation_code,
        status,
        parent_order_id
    ) VALUES (
        p_user_id,
        p_delivery_address,
        p_shipping_address,
        p_quotation_code,
        'confirmed', -- Always set to confirmed
        NULL
    ) RETURNING id INTO v_order_id;
    
    -- Get the order code
    SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
    
    -- Process each selected merchant
    FOR v_merchant_data IN SELECT * FROM jsonb_array_elements(p_selected_merchants)
    LOOP
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
            v_merchant_data->>'merchant_code',
            v_merchant_data->'items',
            (v_merchant_data->>'total_amount')::NUMERIC,
            'confirmed', -- Always set to confirmed
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
-- 5. VERIFY THE CHANGES
-- ========================================

-- Check the new default status
SELECT 
    'DEFAULT STATUS CHECK' as info,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'status';

-- Check the constraint
SELECT 
    'CONSTRAINT CHECK' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_status_check';

-- Check current orders status distribution
SELECT 
    'CURRENT ORDERS STATUS' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;