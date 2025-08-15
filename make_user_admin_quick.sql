-- Quick Fix: Make a user admin
-- Replace 'your-email@example.com' with your actual email

-- Option 1: Update existing user to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Option 2: If user doesn't exist in user_profiles, create them
-- First, get the user ID from auth.users
-- Then insert into user_profiles
INSERT INTO user_profiles (user_id, email, role, first_name, last_name, created_at)
SELECT 
    id,
    email,
    'admin',
    'Admin',
    'User',
    NOW()
FROM auth.users 
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin';

-- Option 3: Make the first user in the system admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = (SELECT user_id FROM user_profiles ORDER BY created_at ASC LIMIT 1);

-- Verify the change
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin';
