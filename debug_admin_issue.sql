-- Debug Admin User Issues
-- Run this in your Supabase SQL editor

-- 1. Check if user_profiles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. Check all users in user_profiles table
SELECT 
    id,
    user_id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 3. Check specifically for admin users
SELECT 
    id,
    user_id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM user_profiles 
WHERE role ILIKE '%admin%'
ORDER BY created_at DESC;

-- 4. Check auth.users table (if accessible)
-- Note: This might not work due to RLS policies
SELECT 
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC;

-- 5. Check for any users without profiles
-- This query might not work due to RLS, but worth trying
SELECT 
    au.id,
    au.email,
    au.created_at,
    up.role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- 6. Create an admin user if none exists
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_profiles (user_id, email, role, first_name, last_name, created_at)
SELECT 
    id,
    email,
    'admin',
    'Admin',
    'User',
    NOW()
FROM auth.users 
WHERE email = 'your-email@example.com'
AND id NOT IN (SELECT user_id FROM user_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

-- 7. Update existing user to admin (replace with your email)
UPDATE user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-email@example.com';

-- 8. Check RLS policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';
