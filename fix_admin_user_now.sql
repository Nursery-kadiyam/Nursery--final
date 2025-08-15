-- IMMEDIATE FIX: Create admin profile for the specific user
-- Run this in your Supabase SQL editor

-- Step 1: Create admin profile for the specific user
INSERT INTO user_profiles (user_id, email, role, first_name, last_name, created_at)
VALUES (
    'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b',
    'pullajiabbireddy143@gmail.com',
    'admin',
    'Admin',
    'User',
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    email = 'pullajiabbireddy143@gmail.com',
    updated_at = NOW();

-- Step 2: Verify the admin user was created
SELECT 
    id,
    user_id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM user_profiles 
WHERE user_id = 'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b';

-- Step 3: Check all admin users
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
