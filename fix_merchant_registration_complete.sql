-- COMPLETE MERCHANT REGISTRATION FIX
-- Run this script in your Supabase SQL Editor

-- 1. Drop existing merchants table and recreate with correct structure
DROP TABLE IF EXISTS public.merchants CASCADE;

-- 2. Create merchants table with correct structure
CREATE TABLE public.merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nursery_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    nursery_address TEXT NOT NULL,
    merchant_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Disable RLS on merchants table for now
ALTER TABLE public.merchants DISABLE ROW LEVEL SECURITY;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_email ON public.merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_code ON public.merchants(merchant_code);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);

-- 5. Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW EXECUTE FUNCTION public.update_merchants_updated_at();

-- 7. Grant necessary permissions
GRANT ALL ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;
GRANT ALL ON public.merchants TO anon;

-- 8. Create or replace the merchant registration function
CREATE OR REPLACE FUNCTION public.register_merchant(
    p_full_name TEXT,
    p_nursery_name TEXT,
    p_phone_number TEXT,
    p_email TEXT,
    p_nursery_address TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_merchant_code TEXT;
    v_year INTEGER;
    v_timestamp TEXT;
    v_random_suffix TEXT;
    v_result JSONB;
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM public.merchants WHERE email = p_email) THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Email already registered',
            'message', 'This email is already registered as a merchant. Please use a different email.'
        );
        RETURN v_result;
    END IF;
    
    -- Generate unique merchant code with timestamp and random suffix
    v_year := EXTRACT(YEAR FROM NOW());
    v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
    v_random_suffix := UPPER(substring(md5(random()::text) from 1 for 4));
    v_merchant_code := 'MC-' || v_year || '-' || v_random_suffix;
    
    -- Ensure merchant code is unique
    WHILE EXISTS (SELECT 1 FROM public.merchants WHERE merchant_code = v_merchant_code) LOOP
        v_random_suffix := UPPER(substring(md5(random()::text) from 1 for 4));
        v_merchant_code := 'MC-' || v_year || '-' || v_random_suffix;
    END LOOP;
    
    -- Insert into merchants table only (merchants don't need user_profiles entry)
    INSERT INTO public.merchants (
        full_name,
        nursery_name,
        phone_number,
        email,
        nursery_address,
        merchant_code,
        status,
        user_id
    ) VALUES (
        p_full_name,
        p_nursery_name,
        p_phone_number,
        p_email,
        p_nursery_address,
        v_merchant_code,
        'pending',
        p_user_id
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'merchant_code', v_merchant_code,
        'message', 'Merchant registration submitted successfully. Your request will be reviewed by our admin team.'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Handle unique constraint violations
        IF SQLERRM LIKE '%email%' THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', 'Email already exists',
                'message', 'This email is already registered. Please use a different email.'
            );
        ELSIF SQLERRM LIKE '%merchant_code%' THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', 'Merchant code conflict',
                'message', 'There was a conflict with the merchant code. Please try again.'
            );
        ELSE
            v_result := jsonb_build_object(
                'success', false,
                'error', 'Duplicate entry',
                'message', 'This information already exists. Please use different details.'
            );
        END IF;
        RETURN v_result;
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to register merchant. Please try again.'
        );
        RETURN v_result;
END;
$$;

-- 9. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.register_merchant TO anon;
GRANT EXECUTE ON FUNCTION public.register_merchant TO authenticated;

-- 10. Create a function to link merchant to auth user after auth creation
CREATE OR REPLACE FUNCTION public.link_merchant_to_user(
    p_email TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update merchant record with user_id
    UPDATE public.merchants 
    SET user_id = p_user_id 
    WHERE email = p_email AND user_id IS NULL;
    
    IF FOUND THEN
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Merchant linked to user successfully'
        );
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Merchant not found or already linked',
            'message', 'Could not link merchant to user.'
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to link merchant to user.'
        );
        RETURN v_result;
END;
$$;

-- 11. Grant execute permission on the link function
GRANT EXECUTE ON FUNCTION public.link_merchant_to_user TO authenticated;

-- 12. Verify the setup
SELECT '=== MERCHANT REGISTRATION FIXED ===' as status;
SELECT 
    '✅ merchants table recreated' as step_1,
    '✅ RLS disabled' as step_2,
    '✅ Indexes created' as step_3,
    '✅ Updated timestamp trigger created' as step_4,
    '✅ Permissions granted' as step_5,
    '✅ register_merchant function created' as step_6,
    '✅ link_merchant_to_user function created' as step_7;

-- 13. Show table structure
SELECT '=== TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'merchants' 
AND table_schema = 'public'
ORDER BY ordinal_position;
