-- Test Admin Access
-- Run this after the fix_database_permissions.sql script

-- Test 1: Check if admin user exists
SELECT 
    'Admin User Check' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASSED - Admin user found'
        ELSE 'FAILED - No admin user found'
    END as result,
    COUNT(*) as admin_count
FROM user_profiles 
WHERE user_id = 'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b' 
AND role = 'admin';

-- Test 2: Check if user_profiles table has correct structure
SELECT 
    'Table Structure Check' as test_name,
    CASE 
        WHEN COUNT(*) >= 5 THEN 'PASSED - Table has required columns'
        ELSE 'FAILED - Missing required columns'
    END as result,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('id', 'user_id', 'email', 'role', 'first_name', 'last_name', 'created_at');

-- Test 3: Check RLS policies
SELECT 
    'RLS Policies Check' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN 'PASSED - RLS policies configured'
        ELSE 'FAILED - Missing RLS policies'
    END as result,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Test 4: Show all admin users
SELECT 
    'All Admin Users' as test_name,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
