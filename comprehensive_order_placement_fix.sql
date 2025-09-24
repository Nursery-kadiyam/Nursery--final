-- Comprehensive Order Placement Functions
-- These functions properly handle both orders and order_items tables

-- Function 1: Create order from quotations with proper order_items
CREATE OR REPLACE FUNCTION create_comprehensive_order_from_quotations(
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
    
    -- Check if orders already exist for this quotation and user
    SELECT id INTO v_existing_order_id
    FROM orders 
    WHERE quotation_code = p_quotation_code 
    AND user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_order_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order already exists for this quotation. Please check your orders page.'
        );
    END IF;
    
    -- Process each selected merchant - create ONE order per merchant
    FOR v_merchant_data IN SELECT * FROM jsonb_array_elements(p_selected_merchants)
    LOOP
        v_merchant_code := v_merchant_data->>'merchant_code';
        
        -- Create order with only the columns that exist in the schema
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
                p_quotation_code
            ) RETURNING id INTO v_order_item_id;
        END LOOP;
        
        -- Add to arrays for return
        v_order_ids := array_append(v_order_ids, v_order_id);
        v_order_codes := array_append(v_order_codes, v_order_code);
        
        -- Add total to running total
        v_total_amount := v_total_amount + (v_merchant_data->>'total_price')::DECIMAL;
    END LOOP;
    
    -- Update quotation status
    UPDATE quotations 
    SET status = 'user_confirmed', 
        user_confirmed_at = NOW(),
        order_placed_at = NOW()
    WHERE quotation_code = p_quotation_code;
    
    -- Return success with order details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Orders created successfully',
        'order_ids', v_order_ids,
        'order_codes', v_order_codes,
        'total_amount', v_total_amount,
        'merchant_count', array_length(v_order_ids, 1)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create orders: ' || SQLERRM
        );
END;
$$;

-- Function 2: Create simple order with proper order_items
CREATE OR REPLACE FUNCTION create_comprehensive_simple_order(
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
    
    -- Create order_items for each item in the cart
    FOR v_item_data IN SELECT * FROM jsonb_array_elements(p_cart_items)
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
            (v_item_data->>'id')::UUID,
            (v_item_data->>'quantity')::INTEGER,
            (v_item_data->>'price')::DECIMAL,
            (v_item_data->>'unit_price')::INTEGER,
            p_merchant_code,
            (v_item_data->>'price')::DECIMAL,
            p_quotation_code
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
GRANT EXECUTE ON FUNCTION create_comprehensive_order_from_quotations TO authenticated;
GRANT EXECUTE ON FUNCTION create_comprehensive_simple_order TO authenticated;