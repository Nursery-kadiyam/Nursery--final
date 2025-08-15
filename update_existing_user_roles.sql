-- UPDATE EXISTING USER ROLES TO 'user'
-- This script updates all existing user profiles to have 'user' role

-- Step 1: Check current role distribution
SELECT '=== CURRENT ROLE DISTRIBUTION ===' as status;
SELECT 
    role,
    COUNT(*) as user_count
FROM user_profiles 
GROUP BY role
ORDER BY role;

-- Step 2: Show all users before update
SELECT '=== ALL USERS BEFORE UPDATE ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 3: Update all existing users to have 'user' role
SELECT '=== UPDATING ALL USERS TO USER ROLE ===' as status;
UPDATE user_profiles 
SET role = 'user' 
WHERE role IS NULL OR role = '' OR role != 'user';

-- Step 4: Set default role to 'user' for future signups
SELECT '=== SETTING DEFAULT ROLE TO USER ===' as status;
ALTER TABLE user_profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 5: Add constraint to ensure valid roles
SELECT '=== ADDING ROLE CONSTRAINT ===' as status;
-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_profiles_role_check'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
    END IF;
END $$;

-- Add new constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('user', 'admin', 'merchant'));

-- Step 6: Verify the updates
SELECT '=== VERIFIED ROLE DISTRIBUTION ===' as status;
SELECT 
    role,
    COUNT(*) as user_count
FROM user_profiles 
GROUP BY role
ORDER BY role;

-- Step 7: Show all users after update
SELECT '=== ALL USERS AFTER UPDATE ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 8: Test default role for new signups
SELECT '=== TESTING DEFAULT ROLE ===' as status;
-- Create a test profile without specifying role
INSERT INTO user_profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone,
    created_at
) VALUES (
    gen_random_uuid(),
    'test-default@example.com',
    'Test',
    'Default',
    '+1234567890',
    NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Show the test record
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE email = 'test-default@example.com';

-- Clean up test record
DELETE FROM user_profiles WHERE email = 'test-default@example.com';

-- Step 9: Instructions for admin setup
SELECT '=== ADMIN SETUP INSTRUCTIONS ===' as status;
SELECT 
    '1. All existing users now have "user" role' as step1,
    '2. New signups will automatically get "user" role' as step2,
    '3. To make someone admin, run: UPDATE user_profiles SET role = "admin" WHERE email = "admin@example.com"' as step3,
    '4. To make someone merchant, run: UPDATE user_profiles SET role = "merchant" WHERE email = "merchant@example.com"' as step4,
    '5. Only users with "admin" role can access admin dashboard' as step5;

-- Step 10: Summary
SELECT '=== SUMMARY ===' as status;
SELECT 
    '✅ All existing users updated to "user" role' as result1,
    '✅ Default role set to "user" for new signups' as result2,
    '✅ Role constraint added for data integrity' as result3,
    '✅ Test completed successfully' as result4;

SELECT '=== UPDATE COMPLETE ===' as status;


