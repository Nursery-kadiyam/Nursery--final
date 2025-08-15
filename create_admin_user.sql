-- Create Admin User Script
-- Run this in your Supabase SQL editor

-- Step 1: Check if user_profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
);

-- Step 2: Check current users in user_profiles
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

-- Step 3: Check auth.users table (if accessible)
SELECT 
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC;

-- Step 4: Create admin user profile for the first user in auth.users
-- This will create an admin profile for the most recent user
INSERT INTO user_profiles (user_id, email, role, first_name, last_name, created_at)
SELECT 
    id,
    email,
    'admin',
    'Admin',
    'User',
    NOW()
FROM auth.users 
WHERE id = (
    SELECT id FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1
)
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

-- Step 5: Verify admin user was created
SELECT 
    id,
    user_id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Step 6: Alternative - Update specific user by email
-- Replace 'your-email@example.com' with your actual email
UPDATE user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-email@example.com';

-- Step 7: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles';
