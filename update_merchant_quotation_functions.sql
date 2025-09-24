-- Update Merchant Quotation Functions to Support Modified Specifications
-- This updates the existing functions to include modified_specifications parameter

-- ========================================
-- 1. UPDATE submit_merchant_quotation_simple FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_simple(
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_unit_prices NUMERIC[],
    p_transport_cost NUMERIC DEFAULT 0,
    p_custom_work_cost NUMERIC DEFAULT 0,
    p_estimated_delivery_days INTEGER DEFAULT 7,
    p_modified_specifications JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotation_id TEXT;
    v_result JSONB;
BEGIN
    -- Generate quotation ID
    v_quotation_id := 'MQ-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);
    
    -- Insert merchant quotation
    INSERT INTO quotations (
        id,
        quotation_code,
        merchant_code,
        is_user_request,
        status,
        unit_prices,
        transport_cost,
        custom_work_cost,
        estimated_delivery_days,
        total_quote_price,
        modified_specifications,
        created_at
    ) VALUES (
        v_quotation_id,
        p_quotation_code,
        p_merchant_code,
        FALSE,
        'pending',
        p_unit_prices,
        p_transport_cost,
        p_custom_work_cost,
        p_estimated_delivery_days,
        (SELECT COALESCE(array_sum(p_unit_prices), 0) + p_transport_cost + p_custom_work_cost),
        p_modified_specifications,
        now()
    );
    
    -- Return success
    v_result := jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'message', 'Merchant quotation submitted successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error submitting merchant quotation: ' || SQLERRM
        );
END;
$$;

-- ========================================
-- 2. UPDATE submit_merchant_quotation_final FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.submit_merchant_quotation_final(
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_unit_prices TEXT,
    p_transport_cost TEXT,
    p_custom_work_cost TEXT,
    p_estimated_delivery_days TEXT,
    p_modified_specifications TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotation_id TEXT;
    v_unit_prices_array NUMERIC[];
    v_transport_cost_num NUMERIC;
    v_custom_work_cost_num NUMERIC;
    v_estimated_delivery_days_num INTEGER;
    v_modified_specifications_json JSONB;
    v_result JSONB;
BEGIN
    -- Generate quotation ID
    v_quotation_id := 'MQ-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);
    
    -- Parse parameters
    v_unit_prices_array := (p_unit_prices::JSON)::NUMERIC[];
    v_transport_cost_num := p_transport_cost::NUMERIC;
    v_custom_work_cost_num := p_custom_work_cost::NUMERIC;
    v_estimated_delivery_days_num := p_estimated_delivery_days::INTEGER;
    v_modified_specifications_json := p_modified_specifications::JSONB;
    
    -- Insert merchant quotation
    INSERT INTO quotations (
        id,
        quotation_code,
        merchant_code,
        is_user_request,
        status,
        unit_prices,
        transport_cost,
        custom_work_cost,
        estimated_delivery_days,
        total_quote_price,
        modified_specifications,
        created_at
    ) VALUES (
        v_quotation_id,
        p_quotation_code,
        p_merchant_code,
        FALSE,
        'pending',
        v_unit_prices_array,
        v_transport_cost_num,
        v_custom_work_cost_num,
        v_estimated_delivery_days_num,
        (SELECT COALESCE(array_sum(v_unit_prices_array), 0) + v_transport_cost_num + v_custom_work_cost_num),
        v_modified_specifications_json,
        now()
    );
    
    -- Return success
    v_result := jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'message', 'Merchant quotation submitted successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error submitting merchant quotation: ' || SQLERRM
        );
END;
$$;

-- ========================================
-- 3. CREATE HELPER FUNCTION FOR ARRAY SUM
-- ========================================

CREATE OR REPLACE FUNCTION array_sum(arr NUMERIC[])
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result NUMERIC := 0;
    element NUMERIC;
BEGIN
    IF arr IS NULL THEN
        RETURN 0;
    END IF;
    
    FOREACH element IN ARRAY arr
    LOOP
        result := result + COALESCE(element, 0);
    END LOOP;
    
    RETURN result;
END;
$$;

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.array_sum TO authenticated;