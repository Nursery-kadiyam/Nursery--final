-- FIX ADMIN LOGIN ISSUE
-- This script fixes the admin login redirect problem

-- Step 1: Check current admin users
SELECT '=== CURRENT ADMIN USERS ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Step 2: Check if user_profiles table has the correct structure
SELECT '=== TABLE STRUCTURE CHECK ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Ensure RLS is disabled for admin operations
SELECT '=== DISABLING RLS FOR ADMIN SETUP ===' as status;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Step 4: Create admin user profile for existing auth users
-- Replace 'your-admin-email@example.com' with the actual admin email
SELECT '=== CREATING ADMIN PROFILE ===' as status;

-- First, find the user ID by email
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'your-admin-email@example.com'; -- Replace with actual admin email
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert or update admin profile
        INSERT INTO user_profiles (
            user_id, 
            email, 
            first_name, 
            last_name, 
            phone, 
            role, 
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            admin_email,
            'Admin',
            'User',
            '+1234567890',
            'admin',
            NOW(),
            NOW()
        ) ON CONFLICT (user_id) 
        DO UPDATE SET 
            role = 'admin',
            updated_at = NOW();
        
        RAISE NOTICE 'Admin profile created/updated for user: %', admin_user_id;
    ELSE
        RAISE NOTICE 'No auth user found with email: %', admin_email;
    END IF;
END $$;

-- Step 5: Alternative method - Update existing user to admin
-- Uncomment and modify the line below to make a specific user admin
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- Step 6: Verify admin user was created
SELECT '=== VERIFYING ADMIN USER ===' as status;
SELECT 
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

-- Step 7: Show all users for reference
SELECT '=== ALL USERS ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 8: Check auth.users table for reference
SELECT '=== AUTH USERS ===' as status;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- Step 9: Instructions for manual setup
SELECT '=== MANUAL SETUP INSTRUCTIONS ===' as status;
SELECT 
    '1. Replace "your-admin-email@example.com" with your actual admin email' as step1,
    '2. Run this script in Supabase SQL Editor' as step2,
    '3. Check the verification results above' as step3,
    '4. Try logging in with the admin email' as step4,
    '5. You should be redirected to /admin-dashboard' as step5;

-- Step 10: Emergency fix - Make all users admin (use only for testing)
-- WARNING: This makes ALL users admin - use only for testing!
-- UPDATE user_profiles SET role = 'admin' WHERE role != 'admin';
