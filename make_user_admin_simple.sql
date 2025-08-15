-- MAKE USER ADMIN - SIMPLE VERSION
-- This script makes any user admin by their email

-- Option 1: Make user admin by email (replace with your email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy0424@gmail.com';

-- Option 2: Make the first user admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM user_profiles ORDER BY created_at ASC LIMIT 1);

-- Option 3: Make all existing users admin (use with caution)
-- UPDATE user_profiles SET role = 'admin';

-- Verify the changes
SELECT '=== ADMIN USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Show all users
SELECT '=== ALL USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;
