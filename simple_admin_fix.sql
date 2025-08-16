-- Simple Admin Fix
-- Run this in your Supabase SQL editor

-- Step 1: Add missing columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Step 2: Update user_id values
UPDATE user_profiles 
SET user_id = au.id
FROM auth.users au
WHERE user_profiles.email = au.email
AND user_profiles.user_id IS NULL;

-- Step 3: Set admin role for your email
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 4: Verify
SELECT 
    'Your Profile' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE email = 'pullajiabbireddy143@gmail.com';
