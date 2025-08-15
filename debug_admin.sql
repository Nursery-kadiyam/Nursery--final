-- DEBUG ADMIN USER ISSUE
-- This script helps debug why admin redirection is not working

-- 1. Check all users in user_profiles table
SELECT '=== ALL USERS IN USER_PROFILES ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 2. Check specifically for admin users
SELECT '=== ADMIN USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 3. Check table structure
SELECT '=== TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check for users with specific email (replace with your email)
SELECT '=== CHECKING SPECIFIC EMAIL ===' as status;
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE email LIKE '%pullajiabbireddy%'
ORDER BY created_at DESC;

-- 5. Show the most recent users
SELECT '=== MOST RECENT USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 10;
