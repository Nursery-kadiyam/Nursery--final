-- NEW QUOTATION FLOW SYSTEM
-- This implements the new quotation flow where:
-- 1. User raises quotation request
-- 2. Multiple merchants respond with their prices
-- 3. User can see all responses and select different merchants for different plants
-- 4. Admin only monitors (no approval needed)

-- ========================================
-- 1. UPDATE QUOTATIONS TABLE STRUCTURE
-- ========================================

-- Add new columns to support the new flow
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS is_user_request BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selected_merchants JSONB,
ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS order_placed_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- 2. CREATE NEW FUNCTIONS
-- ========================================

-- Function to create user quotation request
CREATE OR REPLACE FUNCTION public.create_user_quotation_request(
    p_user_id UUID,
    p_user_email TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quotation_id TEXT;
    v_quotation_code TEXT;
    v_result JSONB;
BEGIN
    -- Generate quotation ID and code
    v_quotation_id := 'QT-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    v_quotation_code := public.generate_quotation_code();
    
    -- Insert user quotation request
    INSERT INTO public.quotations (
        id,
        user_id,
        user_email,
        items,
        status,
        quotation_code,
        is_user_request,
        created_at
    ) VALUES (
        v_quotation_id,
        p_user_id,
        p_user_email,
        p_items,
        'pending',
        v_quotation_code,
        TRUE,
        NOW()
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'quotation_code', v_quotation_code,
        'message', 'Quotation request created successfully. Merchants will respond with their prices.'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create quotation request'
        );
        RETURN v_result;
END;
$$;

-- Function for merchants to submit responses
CREATE OR REPLACE FUNCTION public.submit_merchant_quotation(
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
    WHERE quotation_code = p_quotation_code 
    AND is_user_request = TRUE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quotation request not found',
            'message', 'Invalid quotation code'
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
                v_total_price := v_total_price + (v_quantity * v_unit_price);
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
        user_email,
        items,
        unit_prices,
        transport_cost,
        custom_work_cost,
        estimated_delivery_days,
        total_quote_price,
        merchant_code,
        status,
        is_user_request,
        created_at
    ) VALUES (
        v_quotation_id,
        p_quotation_code,
        v_user_quotation.user_id,
        v_user_quotation.user_email,
        v_user_quotation.items,
        p_unit_prices,
        p_transport_cost,
        p_custom_work_cost,
        p_estimated_delivery_days,
        v_total_price,
        p_merchant_code,
        'pending',
        FALSE,
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
            'message', 'Failed to submit merchant quotation'
        );
        RETURN v_result;
END;
$$;

-- Function to get user quotations with merchant responses
CREATE OR REPLACE FUNCTION public.get_user_quotations_with_responses(p_user_id UUID)
RETURNS TABLE (
    quotation_id TEXT,
    quotation_code TEXT,
    items JSONB,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    merchant_response_count BIGINT,
    merchant_responses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.quotation_code,
        q.items,
        q.status,
        q.created_at,
        COALESCE(mr.response_count, 0) as merchant_response_count,
        COALESCE(mr.responses, '[]'::jsonb) as merchant_responses
    FROM quotations q
    LEFT JOIN (
        SELECT 
            quotation_code,
            COUNT(*) as response_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'merchant_code', merchant_code,
                    'unit_prices', unit_prices,
                    'transport_cost', transport_cost,
                    'custom_work_cost', custom_work_cost,
                    'estimated_delivery_days', estimated_delivery_days,
                    'total_quote_price', total_quote_price,
                    'created_at', created_at,
                    'status', status
                )
            ) as responses
        FROM quotations 
        WHERE merchant_code IS NOT NULL 
        AND is_user_request = FALSE
        GROUP BY quotation_code
    ) mr ON q.quotation_code = mr.quotation_code
    WHERE q.user_id = p_user_id 
    AND q.is_user_request = TRUE
    ORDER BY q.created_at DESC;
END;
$$;

-- Function to confirm user's merchant selections
CREATE OR REPLACE FUNCTION public.confirm_user_merchant_selections(
    p_quotation_code TEXT,
    p_selected_merchants JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update user quotation with selected merchants
    UPDATE quotations 
    SET 
        selected_merchants = p_selected_merchants,
        status = 'user_confirmed',
        user_confirmed_at = NOW()
    WHERE quotation_code = p_quotation_code 
    AND is_user_request = TRUE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quotation not found',
            'message', 'Invalid quotation code'
        );
    END IF;
    
    -- Update status of selected merchant quotations
    UPDATE quotations 
    SET status = 'user_confirmed'
    WHERE quotation_code = p_quotation_code 
    AND merchant_code = ANY(
        SELECT jsonb_array_elements_text(p_selected_merchants)
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Merchant selections confirmed successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to confirm merchant selections'
        );
        RETURN v_result;
END;
$$;

-- Function to mark order as placed
CREATE OR REPLACE FUNCTION public.mark_quotation_order_placed(p_quotation_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update user quotation status
    UPDATE quotations 
    SET 
        status = 'order_placed',
        order_placed_at = NOW()
    WHERE quotation_code = p_quotation_code 
    AND is_user_request = TRUE;
    
    -- Update selected merchant quotations status
    UPDATE quotations 
    SET status = 'order_placed'
    WHERE quotation_code = p_quotation_code 
    AND merchant_code IS NOT NULL;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Order marked as placed successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to mark order as placed'
        );
        RETURN v_result;
END;
$$;

-- ========================================
-- 3. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.create_user_quotation_request(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation(TEXT, TEXT, JSONB, NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quotations_with_responses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_merchant_selections(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_quotation_order_placed(TEXT) TO authenticated;

-- ========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quotations_is_user_request ON quotations(is_user_request);
CREATE INDEX IF NOT EXISTS idx_quotations_user_email ON quotations(user_email);
CREATE INDEX IF NOT EXISTS idx_quotations_selected_merchants ON quotations USING GIN(selected_merchants);

-- ========================================
-- 5. VERIFY SETUP
-- ========================================

SELECT '=== NEW QUOTATION FLOW SYSTEM SETUP COMPLETE ===' as status;

SELECT 
    '✅ Quotations table updated with new columns' as step_1,
    '✅ create_user_quotation_request function created' as step_2,
    '✅ submit_merchant_quotation function created' as step_3,
    '✅ get_user_quotations_with_responses function created' as step_4,
    '✅ confirm_user_merchant_selections function created' as step_5,
    '✅ mark_quotation_order_placed function created' as step_6,
    '✅ Permissions granted' as step_7,
    '✅ Indexes created' as step_8;

-- Show updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
