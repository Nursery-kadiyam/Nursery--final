-- Fix Admin User Role
-- Run this in your Supabase SQL editor

-- Step 1: Check current user_profiles table
SELECT 
    'Current User Profiles' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Step 2: Check auth.users table
SELECT 
    'Auth Users' as check_type,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 3: Set admin role for a specific user (replace with your admin email)
-- Option 1: Update by email
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@gmail.com';

-- Option 2: Update the first user to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = (SELECT MIN(id) FROM user_profiles);

-- Option 3: Create admin profile if it doesn't exist
INSERT INTO user_profiles (user_id, email, first_name, last_name, role, created_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'first_name', 'Admin'),
    COALESCE(raw_user_meta_data->>'last_name', 'User'),
    'admin',
    NOW()
FROM auth.users 
WHERE email = 'your-admin-email@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Step 4: Verify the changes
SELECT 
    'Updated User Profiles' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
