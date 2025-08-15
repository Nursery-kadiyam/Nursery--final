-- FIX USER ROLE DEFAULT
-- This script sets the default role to 'user' in user_profiles table

-- Step 1: Check current table structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name = 'role'
ORDER BY ordinal_position;

-- Step 2: Update existing records to have 'user' role (except admin users)
SELECT '=== UPDATING EXISTING RECORDS ===' as status;
UPDATE user_profiles 
SET role = 'user' 
WHERE role IS NULL OR role = '';

-- Step 3: Alter table to set default value for role column
SELECT '=== SETTING DEFAULT ROLE ===' as status;
ALTER TABLE user_profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 4: Add check constraint to ensure role is one of valid values
SELECT '=== ADDING ROLE CONSTRAINT ===' as status;
-- First, drop existing constraint if it exists
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
ALTER TABLE user_profiles 5
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('user', 'admin', 'merchant'));

-- Step 5: Verify the changes
SELECT '=== VERIFYING CHANGES ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name = 'role';

-- Step 6: Show current role distribution
SELECT '=== CURRENT ROLE DISTRIBUTION ===' as status;
SELECT 
    role,
    COUNT(*) as user_count
FROM user_profiles 
GROUP BY role
ORDER BY role;

-- Step 7: Show all users with their roles
SELECT '=== ALL USERS WITH ROLES ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 8: Instructions for admin setup
SELECT '=== ADMIN SETUP INSTRUCTIONS ===' as status;
SELECT 
    '1. New users will have "user" role by default' as step1,
    '2. To make someone admin, run: UPDATE user_profiles SET role = "admin" WHERE email = "admin@example.com"' as step2,
    '3. To make someone merchant, run: UPDATE user_profiles SET role = "merchant" WHERE email = "merchant@example.com"' as step3,
    '4. Only users with "admin" role can access admin dashboard' as step4;

-- Step 9: Test insert with default role
SELECT '=== TESTING DEFAULT ROLE ===' as status;
-- Create a test profile to verify default role works
INSERT INTO user_profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone,
    created_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    'Test',
    'User',
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
WHERE email = 'test@example.com';

-- Clean up test record
DELETE FROM user_profiles WHERE email = 'test@example.com';

SELECT '=== CLEANUP COMPLETE ===' as status;
