-- Update place_order function to support order splitting
-- This function creates parent and child orders when user places an order

CREATE OR REPLACE FUNCTION place_order_with_splitting(
    p_user_id uuid,
    p_delivery_address jsonb,
    p_cart_items jsonb,
    p_total_amount numeric,
    p_quotation_code text DEFAULT NULL,
    p_razorpay_payment_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_order_id uuid;
    v_child_order_id uuid;
    v_result jsonb;
    v_cart_item jsonb;
    v_item_id uuid;
    v_quantity integer;
    v_price numeric;
    v_unit_price numeric;
    v_merchant_code text;
    v_merchant_groups jsonb := '{}';
    v_merchant_group jsonb;
    v_merchant_total numeric;
    v_order_code text;
    v_parent_order_code text;
BEGIN
    -- Generate order codes
    v_parent_order_code := 'ORD-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    
    -- Group cart items by merchant
    FOR v_cart_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_merchant_code := COALESCE(v_cart_item->>'merchant_code', v_cart_item->>'selected_merchant', 'admin');
        
        -- Initialize merchant group if not exists
        IF NOT (v_merchant_groups ? v_merchant_code) THEN
            v_merchant_groups := v_merchant_groups || jsonb_build_object(v_merchant_code, jsonb_build_array());
        END IF;
        
        -- Add item to merchant group
        v_merchant_groups := jsonb_set(
            v_merchant_groups, 
            ARRAY[v_merchant_code], 
            (v_merchant_groups->v_merchant_code) || v_cart_item
        );
    END LOOP;
    
    -- Create parent order
    INSERT INTO orders (
        user_id,
        delivery_address,
        cart_items,
        total_amount,
        quotation_code,
        parent_order_id,
        merchant_code,
        order_code,
        status,
        razorpay_payment_id,
        payment_status
    ) VALUES (
        p_user_id,
        p_delivery_address,
        p_cart_items,
        p_total_amount,
        p_quotation_code,
        NULL, -- This is the parent order
        'multiple', -- Indicates multiple merchants
        v_parent_order_code,
        'pending',
        p_razorpay_payment_id,
        CASE WHEN p_razorpay_payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END
    ) RETURNING id INTO v_parent_order_id;
    
    -- Create child orders for each merchant
    FOR v_merchant_code, v_merchant_group IN SELECT * FROM jsonb_each(v_merchant_groups)
    LOOP
        -- Calculate merchant total
        v_merchant_total := 0;
        FOR v_cart_item IN SELECT * FROM jsonb_array_elements(v_merchant_group)
        LOOP
            v_merchant_total := v_merchant_total + COALESCE((v_cart_item->>'price')::numeric, 0);
        END LOOP;
        
        -- Generate child order code
        v_order_code := 'ORD-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
        
        -- Create child order
        INSERT INTO orders (
            user_id,
            delivery_address,
            cart_items,
            total_amount,
            quotation_code,
            parent_order_id,
            merchant_code,
            order_code,
            status,
            razorpay_payment_id,
            payment_status
        ) VALUES (
            p_user_id,
            p_delivery_address,
            v_merchant_group,
            v_merchant_total,
            p_quotation_code,
            v_parent_order_id, -- Link to parent
            v_merchant_code,
            v_order_code,
            'pending',
            p_razorpay_payment_id,
            CASE WHEN p_razorpay_payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END
        ) RETURNING id INTO v_child_order_id;
        
        -- Insert order items for this merchant
        FOR v_cart_item IN SELECT * FROM jsonb_array_elements(v_merchant_group)
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
                v_child_order_id,
                v_item_id,
                v_quantity,
                v_price,
                COALESCE(v_unit_price, v_price / v_quantity),
                v_quantity * COALESCE(v_unit_price, v_price / v_quantity),
                v_merchant_code
            );
        END LOOP;
    END LOOP;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'parent_order_id', v_parent_order_id,
        'parent_order_code', v_parent_order_code,
        'message', 'Order placed successfully with merchant splitting'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to place order with splitting'
        );
        RETURN v_result;
END;
$$;