-- Fix admin user issue
-- This script will make an existing user an admin

-- 1. First, let's see all users and their current roles
SELECT '=== CURRENT USERS AND ROLES ===' as check_type;
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role,
    up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC;

-- 2. Make the first user (or a specific user) an admin
-- Replace 'your-email@example.com' with the actual email of the user you want to make admin
UPDATE user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-email@example.com'  -- Replace with actual email
AND role != 'admin';

-- 3. Alternative: Make the most recent user admin (uncomment if you want this)
-- UPDATE user_profiles 
-- SET role = 'admin', updated_at = NOW()
-- WHERE id = (
--     SELECT id FROM user_profiles 
--     ORDER BY created_at DESC 
--     LIMIT 1
-- );

-- 4. Verify the change
SELECT '=== VERIFICATION - ADMIN USERS ===' as check_type;
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role,
    up.created_at
FROM user_profiles up
WHERE up.role = 'admin';

-- 5. Check if the user_profiles table is accessible
SELECT '=== TABLE ACCESSIBILITY ===' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN '✅ user_profiles accessible'
        ELSE '❌ user_profiles not accessible'
    END as accessibility_status;

-- 6. Check RLS status
SELECT '=== RLS STATUS ===' as check_type;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 7. If RLS is enabled, temporarily disable it for testing
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 8. Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON user_profiles TO service_role;

-- 9. Final verification
SELECT '=== FINAL VERIFICATION ===' as check_type;
SELECT 
    'Admin users count: ' || COUNT(*) as admin_count
FROM user_profiles 
WHERE role = 'admin';

SELECT 
    'Total users count: ' || COUNT(*) as total_users
FROM user_profiles;
