-- Fix Navbar Role Check - Add missing user_id column
-- Run this in your Supabase SQL editor

-- Step 1: Check current table structure
SELECT 
    'Current Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN user_id UUID;
        RAISE NOTICE 'Added user_id column to user_profiles table';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- Step 3: Update user_id values from auth.users
UPDATE user_profiles 
SET user_id = au.id
FROM auth.users au
WHERE user_profiles.email = au.email
AND user_profiles.user_id IS NULL;

-- Step 4: Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added role column to user_profiles table';
    ELSE
        RAISE NOTICE 'role column already exists';
    END IF;
END $$;

-- Step 5: Set admin role for specific user
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 6: Verify the changes
SELECT 
    'Updated User Profiles' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Step 7: Check admin users
SELECT 
    'Admin Users' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE role = 'admin';
