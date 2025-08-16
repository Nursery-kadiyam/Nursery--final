-- Quick Admin Fix - This will definitely work
-- Run this in your Supabase SQL editor

-- Step 1: Add missing columns if they don't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Step 2: Update user_id values from auth.users
UPDATE user_profiles 
SET user_id = au.id
FROM auth.users au
WHERE user_profiles.email = au.email
AND user_profiles.user_id IS NULL;

-- Step 3: Set admin role for your email
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 4: Create profile if it doesn't exist
INSERT INTO user_profiles (user_id, email, role, created_at)
SELECT 
    au.id,
    au.email,
    'admin',
    au.created_at
FROM auth.users au
WHERE au.email = 'pullajiabbireddy143@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.email = au.email
);

-- Step 5: Verify the fix
SELECT 
    'FINAL CHECK - Your Profile' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 6: Show all admin users
SELECT 
    'ALL ADMIN USERS' as check_type,
    id,
    user_id,
    email,
    role
FROM user_profiles
WHERE role = 'admin';
