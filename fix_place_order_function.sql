-- Fix the place_order function to remove stock management dependencies
-- This will ensure order placement works without stock_transactions table

CREATE OR REPLACE FUNCTION place_order(
    p_user_id uuid,
    p_delivery_address jsonb,
    p_cart_items jsonb,
    p_total_amount numeric,
    p_quotation_code text DEFAULT NULL,
    p_merchant_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_result jsonb;
    v_cart_item jsonb;
    v_item_id uuid;
    v_quantity integer;
    v_price numeric;
    v_unit_price numeric;
BEGIN
    -- Insert the main order
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
        COALESCE(p_merchant_code, 'admin'),
        'pending'
    ) RETURNING id INTO v_order_id;
    
    -- Insert order items from cart_items
    FOR v_cart_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_item_id := (v_cart_item->>'id')::uuid;
        v_quantity := (v_cart_item->>'quantity')::integer;
        v_price := (v_cart_item->>'price')::numeric;
        v_unit_price := (v_cart_item->>'unit_price')::numeric;
        
        -- Insert order item
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            unit_price,
            subtotal,
            merchant_code
        ) VALUES (
            v_order_id,
            v_item_id,
            v_quantity,
            v_price,
            COALESCE(v_unit_price, v_price / v_quantity),
            v_quantity * COALESCE(v_unit_price, v_price / v_quantity),
            COALESCE(p_merchant_code, 'admin')
        );
    END LOOP;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order placed successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to place order'
        );
        RETURN v_result;
END;
$$;