-- Create Missing User Profiles
-- Run this in your Supabase SQL editor

-- Step 1: Check what users exist in auth.users but not in user_profiles
SELECT 
    'Missing Profiles Check' as check_type,
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    CASE 
        WHEN up.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ HAS PROFILE'
    END as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id::text = up.user_id
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for all users who don't have them
INSERT INTO user_profiles (user_id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
    au.id::text,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
    'user', -- Default role
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id::text = up.user_id
WHERE up.id IS NULL;

-- Step 3: Make a specific user admin (replace with your email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@gmail.com'; -- Replace with your email

-- Step 4: Verify all users now have profiles
SELECT 
    'All Users with Profiles' as check_type,
    up.id,
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role,
    up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC;

-- Step 5: Check admin users specifically
SELECT 
    'Admin Users' as check_type,
    up.id,
    up.user_id,
    up.email,
    up.role
FROM user_profiles up
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;
