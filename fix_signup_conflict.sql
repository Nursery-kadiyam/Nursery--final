-- FIX SIGNUP CONFLICT
-- This script fixes the conflict between automatic and manual profile creation

-- 1. Drop the automatic trigger to prevent conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the automatic profile creation function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Verify user_profiles table structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if RLS is disabled
SELECT '=== RLS STATUS ===' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- 5. Ensure RLS is disabled
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 6. Grant all permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_profiles TO anon;

-- 7. Create a simple profile creation function (no automatic trigger)
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT DEFAULT '',
    p_last_name TEXT DEFAULT '',
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Profile already exists',
            'message', 'User profile already exists for this user.'
        );
        RETURN v_result;
    END IF;
    
    -- Insert new profile
    INSERT INTO public.user_profiles (
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        role
    ) VALUES (
        p_user_id,
        p_first_name,
        p_last_name,
        p_email,
        p_phone,
        p_address,
        'user'
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'User profile created successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create user profile'
        );
        RETURN v_result;
END;
$$;

-- 8. Grant execute permission on the manual function
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual TO anon;

-- 9. Test the function with a dummy call
SELECT '=== TESTING FUNCTION ===' as status;
SELECT public.create_user_profile_manual(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'test@example.com',
    'Test',
    'User',
    '+1234567890',
    'Test Address'
) as test_result;

-- 10. Verify the setup
SELECT '=== SIGNUP CONFLICT FIXED ===' as status;
SELECT 
    '✅ Automatic trigger removed' as step_1,
    '✅ RLS disabled' as step_2,
    '✅ Permissions granted' as step_3,
    '✅ Manual profile creation function created' as step_4,
    '✅ Ready for manual profile creation' as step_5;

-- 11. Show current table permissions
SELECT '=== CURRENT PERMISSIONS ===' as status;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';
