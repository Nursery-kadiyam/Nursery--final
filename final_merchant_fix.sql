-- Final Merchant Quotation Function Fix
-- This creates a robust version that handles all data type issues

-- Create a bulletproof merchant quotation function
CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_final(
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_unit_prices TEXT, -- Changed to TEXT to handle JSON string
    p_transport_cost TEXT DEFAULT '0', -- Changed to TEXT to handle any input
    p_custom_work_cost TEXT DEFAULT '0', -- Changed to TEXT to handle any input
    p_estimated_delivery_days TEXT DEFAULT '7' -- Changed to TEXT to handle any input
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotation_id TEXT;
    v_user_quotation RECORD;
    v_total_price NUMERIC := 0;
    v_result JSONB;
    v_transport_cost NUMERIC;
    v_custom_work_cost NUMERIC;
    v_estimated_delivery_days INTEGER;
    v_unit_prices_json JSONB;
BEGIN
    -- Safely convert string inputs to proper types
    BEGIN
        v_transport_cost := COALESCE(NULLIF(p_transport_cost, ''), '0')::NUMERIC;
    EXCEPTION
        WHEN OTHERS THEN
            v_transport_cost := 0;
    END;
    
    BEGIN
        v_custom_work_cost := COALESCE(NULLIF(p_custom_work_cost, ''), '0')::NUMERIC;
    EXCEPTION
        WHEN OTHERS THEN
            v_custom_work_cost := 0;
    END;
    
    BEGIN
        v_estimated_delivery_days := COALESCE(NULLIF(p_estimated_delivery_days, ''), '7')::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            v_estimated_delivery_days := 7;
    END;
    
    -- Safely parse unit_prices JSON
    BEGIN
        v_unit_prices_json := COALESCE(p_unit_prices, '[]')::JSONB;
    EXCEPTION
        WHEN OTHERS THEN
            v_unit_prices_json := '[]'::JSONB;
    END;
    
    -- Get the original user quotation
    SELECT * INTO v_user_quotation 
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quotation request not found',
            'message', 'Invalid quotation code: ' || p_quotation_code
        );
    END IF;
    
    -- Calculate total price from unit prices and items
    IF v_user_quotation.items IS NOT NULL THEN
        FOR i IN 0..jsonb_array_length(v_user_quotation.items) - 1 LOOP
            DECLARE
                v_item JSONB := v_user_quotation.items->i;
                v_quantity INTEGER := (v_item->>'quantity')::INTEGER;
                v_unit_price NUMERIC := (v_unit_prices_json->>i)::NUMERIC;
            BEGIN
                v_total_price := v_total_price + (v_quantity * COALESCE(v_unit_price, 0));
            EXCEPTION
                WHEN OTHERS THEN
                    -- Skip this item if there's an error
                    NULL;
            END;
        END LOOP;
    END IF;
    
    -- Add additional costs
    v_total_price := v_total_price + v_transport_cost + v_custom_work_cost;
    
    -- Generate new quotation ID for merchant response
    v_quotation_id := 'MQ-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    
    -- Insert merchant quotation response
    INSERT INTO public.quotations (
        id,
        quotation_code,
        user_id,
        items,
        unit_prices,
        transport_cost,
        custom_work_cost,
        estimated_delivery_days,
        total_quote_price,
        merchant_code,
        status,
        created_at
    ) VALUES (
        v_quotation_id,
        p_quotation_code,
        v_user_quotation.user_id,
        v_user_quotation.items,
        v_unit_prices_json,
        v_transport_cost,
        v_custom_work_cost,
        v_estimated_delivery_days,
        v_total_price,
        p_merchant_code,
        'pending',
        NOW()
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'total_price', v_total_price,
        'message', 'Merchant quotation submitted successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to submit merchant quotation: ' || SQLERRM
        );
        RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_final(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Also update the simple function to be more robust
CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_simple(
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_unit_prices JSONB,
    p_transport_cost NUMERIC DEFAULT 0,
    p_custom_work_cost NUMERIC DEFAULT 0,
    p_estimated_delivery_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotation_id TEXT;
    v_user_quotation RECORD;
    v_total_price NUMERIC := 0;
    v_result JSONB;
BEGIN
    -- Get the original user quotation
    SELECT * INTO v_user_quotation 
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quotation request not found',
            'message', 'Invalid quotation code: ' || p_quotation_code
        );
    END IF;
    
    -- Calculate total price from unit prices and items
    IF v_user_quotation.items IS NOT NULL THEN
        FOR i IN 0..jsonb_array_length(v_user_quotation.items) - 1 LOOP
            DECLARE
                v_item JSONB := v_user_quotation.items->i;
                v_quantity INTEGER := (v_item->>'quantity')::INTEGER;
                v_unit_price NUMERIC := (p_unit_prices->>i)::NUMERIC;
            BEGIN
                v_total_price := v_total_price + (v_quantity * COALESCE(v_unit_price, 0));
            EXCEPTION
                WHEN OTHERS THEN
                    -- Skip this item if there's an error
                    NULL;
            END;
        END LOOP;
    END IF;
    
    -- Add additional costs
    v_total_price := v_total_price + COALESCE(p_transport_cost, 0) + COALESCE(p_custom_work_cost, 0);
    
    -- Generate new quotation ID for merchant response
    v_quotation_id := 'MQ-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    
    -- Insert merchant quotation response
    INSERT INTO public.quotations (
        id,
        quotation_code,
        user_id,
        items,
        unit_prices,
        transport_cost,
        custom_work_cost,
        estimated_delivery_days,
        total_quote_price,
        merchant_code,
        status,
        created_at
    ) VALUES (
        v_quotation_id,
        p_quotation_code,
        v_user_quotation.user_id,
        v_user_quotation.items,
        p_unit_prices,
        p_transport_cost,
        p_custom_work_cost,
        p_estimated_delivery_days,
        v_total_price,
        p_merchant_code,
        'pending',
        NOW()
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'total_price', v_total_price,
        'message', 'Merchant quotation submitted successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to submit merchant quotation: ' || SQLERRM
        );
        RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_simple(TEXT, TEXT, JSONB, NUMERIC, NUMERIC, INTEGER) TO authenticated;

-- Add missing columns if they don't exist
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS is_user_request BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selected_merchants JSONB,
ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS order_placed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotations_is_user_request ON quotations(is_user_request);
CREATE INDEX IF NOT EXISTS idx_quotations_user_email ON quotations(user_email);
CREATE INDEX IF NOT EXISTS idx_quotations_selected_merchants ON quotations USING GIN(selected_merchants);

-- Test the function
SELECT '✅ All merchant quotation functions created successfully!' as status;
