-- Debug Admin Dashboard Issues
-- Run this in your Supabase SQL editor

-- Step 1: Check table structure
SELECT 
    'Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check your profile
SELECT 
    'Your Profile' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 3: Check all admin users
SELECT 
    'All Admin Users' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE role = 'admin' OR role = 'ADMIN' OR role = 'Admin';

-- Step 4: Check auth.users for your email
SELECT 
    'Auth Users' as check_type,
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 5: Check RLS policies
SELECT 
    'RLS Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY tablename, policyname;
