-- Check and fix admin user issue
-- This script will help diagnose why admin dashboard is not appearing

-- 1. Check if user_profiles table exists and has data
SELECT '=== USER_PROFILES TABLE CHECK ===' as check_type;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
        THEN '✅ user_profiles table exists'
        ELSE '❌ user_profiles table missing'
    END as table_status;

-- 2. Check user_profiles table structure
SELECT '=== USER_PROFILES STRUCTURE ===' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check all users in user_profiles table
SELECT '=== ALL USERS IN USER_PROFILES ===' as check_type;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
FROM user_profiles
ORDER BY created_at DESC;

-- 4. Check auth.users table
SELECT '=== AUTH.USERS CHECK ===' as check_type;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 5. Check if there are any admin users
SELECT '=== ADMIN USERS CHECK ===' as check_type;
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role,
    up.created_at
FROM user_profiles up
WHERE up.role = 'admin';

-- 6. Check RLS status
SELECT '=== RLS STATUS ===' as check_type;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 7. Check permissions
SELECT '=== PERMISSIONS CHECK ===' as check_type;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'user_profiles';

-- 8. If no admin user exists, create one (replace with actual admin email)
SELECT '=== ADMIN USER CREATION ===' as check_type;

-- First, let's see if we have any users in auth.users that could be made admin
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE 
        WHEN up.id IS NOT NULL THEN 'Has profile'
        ELSE 'No profile'
    END as profile_status,
    up.role as current_role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.created_at DESC;

-- 9. Instructions for fixing admin user
SELECT '=== FIX INSTRUCTIONS ===' as check_type;
SELECT 
    'To fix admin dashboard access:' as instruction,
    '1. Find the user email you want to make admin' as step1,
    '2. Run: UPDATE user_profiles SET role = ''admin'' WHERE email = ''your-admin-email@example.com'';' as step2,
    '3. Or create new admin user with the script below' as step3;
