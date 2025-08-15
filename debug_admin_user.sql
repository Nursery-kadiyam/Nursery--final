-- DEBUG ADMIN USER - Check specific admin user
-- This script checks the admin user you manually set

-- 1. Check the specific admin user
SELECT '=== CHECKING ADMIN USER ===' as status;
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
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 2. Check for any users with your email
SELECT '=== CHECKING YOUR EMAIL ===' as status;
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE email LIKE '%pullajiabbireddy%'
ORDER BY created_at DESC;

-- 3. Show all users to see the structure
SELECT '=== ALL USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 4. Check table structure
SELECT '=== TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
