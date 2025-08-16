-- Debug Admin Dashboard Issue
-- Run this in your Supabase SQL editor

-- Step 1: Check if user_id and role columns exist
SELECT 
    'Table Structure Check' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check all user profiles with roles
SELECT 
    'All User Profiles' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Step 3: Check admin users specifically
SELECT 
    'Admin Users' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE role = 'admin' OR role = 'ADMIN' OR role = 'Admin';

-- Step 4: Check if your email exists in user_profiles
SELECT 
    'Your Profile Check' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 5: Check auth.users for your email
SELECT 
    'Auth Users Check' as check_type,
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'pullajiabbireddy143@gmail.com';
