-- CHECK AND FIX USER_PROFILES TABLE
-- This script checks the user_profiles table and fixes any issues

-- 1. Check if user_profiles table exists
SELECT '=== CHECKING USER_PROFILES TABLE ===' as status;

-- 2. Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show all users and their roles
SELECT '=== ALL USERS AND ROLES ===' as status;
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

-- 4. Show admin users specifically
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

-- 5. Check for users without roles
SELECT '=== USERS WITHOUT ROLES ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE role IS NULL OR role = ''
ORDER BY created_at DESC;

-- 6. Fix users without roles (set them to 'user')
UPDATE user_profiles 
SET role = 'user', updated_at = NOW()
WHERE role IS NULL OR role = '';

-- 7. Verify the fix
SELECT '=== AFTER FIX - ALL USERS ===' as status;
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
