-- Fix Order Placement Function
-- This creates a simplified function that works with the current schema

-- Drop and recreate the function with correct column references
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
BEGIN
    -- Delete existing orders for this quotation and user to avoid conflicts
    IF p_quotation_code IS NOT NULL THEN
        DELETE FROM order_items 
        WHERE order_id IN (
            SELECT id FROM orders 
            WHERE quotation_code = p_quotation_code 
            AND user_id = p_user_id
        );
        
        DELETE FROM orders 
        WHERE quotation_code = p_quotation_code 
        AND user_id = p_user_id;
    END IF;
    
    -- Create order with only the columns that exist in the schema
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
        'confirmed'
    ) RETURNING id INTO v_order_id;
    
    -- Get the generated order code
    SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
    
    -- Create order_items for each item in the cart (only with existing columns)
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
        'message', 'Order created successfully',
        'order_id', v_order_id,
        'order_code', v_order_code
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create order: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_or_update_simple_order TO authenticated;

-- Test the function
SELECT 'Function created successfully' as status;