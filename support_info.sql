-- SUPPORT INFORMATION GATHERING
-- Run this and share the results with Supabase support

-- 1. Project Information
SELECT '=== PROJECT INFO ===' as status;
SELECT 'Project ID: rjapkpboonxljiupceyq' as info1;
SELECT 'Project URL: https://rjapkpboonxljiupceyq.supabase.co' as info2;

-- 2. Current Database State
SELECT '=== DATABASE STATE ===' as status;

-- Check user_profiles table
SELECT '=== USER_PROFILES TABLE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 3. Check for any triggers
SELECT '=== TRIGGERS ON AUTH.USERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 4. Check for any functions
SELECT '=== FUNCTIONS ===' as status;
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%user%' 
OR routine_name LIKE '%profile%'
OR routine_name LIKE '%auth%'
ORDER BY routine_schema, routine_name;

-- 5. Check policies
SELECT '=== POLICIES ===' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname IN ('public', 'auth');

-- 6. Test basic functionality
SELECT '=== BASIC FUNCTIONALITY TEST ===' as status;

-- Test if we can access auth.users
SELECT '=== AUTH.USERS ACCESS ===' as status;
SELECT COUNT(*) as total_users FROM auth.users;

-- Test profile creation
SELECT '=== PROFILE CREATION TEST ===' as status;
DO $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        address, 
        role
    ) VALUES (
        gen_random_uuid(),
        'support@test.com',
        'Support',
        'Test',
        '1234567890',
        'Support Address',
        'user'
    );
    
    RAISE NOTICE '✅ Profile creation test successful';
    
    -- Clean up
    DELETE FROM public.user_profiles WHERE email = 'support@test.com';
    RAISE NOTICE '✅ Cleanup completed';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Profile creation test failed: %', SQLERRM;
END $$;

-- 7. Issue Summary
SELECT '=== ISSUE SUMMARY ===' as status;
SELECT 'Problem: New user registration fails with "Database error saving new user" (500 error)' as problem;
SELECT 'Steps taken:' as steps_header;
SELECT '  - Removed problematic triggers and functions' as step1;
SELECT '  - Disabled RLS on user_profiles table' as step2;
SELECT '  - Fixed registration code (removed options.data)' as step3;
SELECT '  - Updated Site URL to localhost:8080' as step4;
SELECT '  - Verified JWT expiry is 3600' as step5;
SELECT '  - Email confirmations temporarily disabled' as step6;
SELECT 'Issue persists despite all fixes' as conclusion;
