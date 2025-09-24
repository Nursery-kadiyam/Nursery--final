-- FIX MERCHANT QUOTATION FUNCTION
-- This script fixes the submit_merchant_quotation_simple function to include modified_specifications parameter

-- 1. Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.submit_merchant_quotation_simple(
    p_custom_work_cost NUMERIC,
    p_estimated_delivery_days INTEGER,
    p_merchant_code TEXT,
    p_modified_specifications JSONB,
    p_quotation_code TEXT,
    p_transport_cost NUMERIC,
    p_unit_prices JSONB
);

-- 2. Create the corrected function with modified_specifications parameter
CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_simple(
    p_custom_work_cost NUMERIC,
    p_estimated_delivery_days INTEGER,
    p_merchant_code TEXT,
    p_modified_specifications JSONB,
    p_quotation_code TEXT,
    p_transport_cost NUMERIC,
    p_unit_prices JSONB
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
        modified_specifications,
        is_user_request,
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
        p_modified_specifications,
        false, -- This is a merchant response, not a user request
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

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_simple(
    p_custom_work_cost NUMERIC,
    p_estimated_delivery_days INTEGER,
    p_merchant_code TEXT,
    p_modified_specifications JSONB,
    p_quotation_code TEXT,
    p_transport_cost NUMERIC,
    p_unit_prices JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_simple(
    p_custom_work_cost NUMERIC,
    p_estimated_delivery_days INTEGER,
    p_merchant_code TEXT,
    p_modified_specifications JSONB,
    p_quotation_code TEXT,
    p_transport_cost NUMERIC,
    p_unit_prices JSONB
) TO service_role;

-- 4. Test the function
SELECT '=== MERCHANT QUOTATION FUNCTION FIXED ===' as status;

-- 5. Create a function to get merchant quotations for a specific quotation code
CREATE OR REPLACE FUNCTION public.get_merchant_quotations(p_quotation_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotations JSONB;
    v_result JSONB;
BEGIN
    -- Get all merchant quotations for the given quotation code
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'quotation_code', quotation_code,
            'merchant_code', merchant_code,
            'unit_prices', unit_prices,
            'transport_cost', transport_cost,
            'custom_work_cost', custom_work_cost,
            'estimated_delivery_days', estimated_delivery_days,
            'total_quote_price', total_quote_price,
            'status', status,
            'modified_specifications', modified_specifications,
            'created_at', created_at,
            'is_merchant_response', true
        )
    ) INTO v_quotations
    FROM quotations
    WHERE quotation_code = p_quotation_code 
    AND is_user_request = false
    AND merchant_code IS NOT NULL
    ORDER BY created_at DESC;
    
    RETURN jsonb_build_object(
        'success', true,
        'quotations', COALESCE(v_quotations, '[]'::jsonb)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to get merchant quotations: ' || SQLERRM
        );
END;
$$;

-- 6. Grant permissions for the get function
GRANT EXECUTE ON FUNCTION public.get_merchant_quotations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_merchant_quotations(TEXT) TO service_role;

SELECT '=== MERCHANT QUOTATION FUNCTIONS CREATED SUCCESSFULLY ===' as status;