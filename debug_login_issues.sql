-- DEBUG LOGIN ISSUES
-- Run this in Supabase SQL Editor to diagnose login problems

-- 1. Check if auth.users table exists and has data
SELECT '=== AUTH.USERS TABLE CHECK ===' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✅ auth.users table exists'
        ELSE '❌ auth.users table missing - CRITICAL ISSUE'
    END as auth_users_status;

-- 2. Check if there are any users in auth.users (if accessible)
-- Note: This might not work due to RLS, but worth trying
SELECT '=== AUTH USERS COUNT ===' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users LIMIT 1
        ) THEN '✅ Users exist in auth.users'
        ELSE '⚠️ No users found or access denied'
    END as users_status;

-- 3. Check user_profiles table for any existing users
SELECT '=== USER_PROFILES CHECK ===' as check_type;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as profiles_with_user_id,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email
FROM user_profiles;

-- 4. Check guest_users table
SELECT '=== GUEST_USERS CHECK ===' as check_type;
SELECT 
    COUNT(*) as total_guest_users,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as guests_with_user_id,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as guests_with_email
FROM guest_users;

-- 5. Check RLS policies on auth-related tables
SELECT '=== RLS POLICIES CHECK ===' as check_type;
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN tablename = 'user_profiles' AND cmd = 'INSERT' THEN '⚠️ May block profile creation'
        WHEN tablename = 'guest_users' AND cmd = 'ALL' THEN '✅ Public access'
        ELSE '✅ Normal policy'
    END as status
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders')
ORDER BY tablename, cmd;

-- 6. Check if RLS is enabled on tables
SELECT '=== RLS ENABLED STATUS ===' as check_type;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '⚠️ RLS enabled - may cause permission issues'
        ELSE '✅ RLS disabled - no permission issues'
    END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- 7. Test basic insert permissions
SELECT '=== INSERT PERMISSION TEST ===' as check_type;

-- Test guest_users insert (should work)
DO $$
BEGIN
    BEGIN
        INSERT INTO guest_users (email, first_name, last_name, phone) 
        VALUES ('test-debug@example.com', 'Test', 'Debug', '1234567890');
        RAISE NOTICE '✅ guest_users insert works';
        DELETE FROM guest_users WHERE email = 'test-debug@example.com';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ guest_users insert failed: %', SQLERRM;
    END;
END $$; 