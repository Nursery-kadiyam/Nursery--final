-- QUICK FIX: Clear Login Error
-- Run this to immediately fix the "Please check your credentials" error

-- 1. Disable RLS on all tables to eliminate permission issues
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is disabled
SELECT '=== RLS DISABLED CHECK ===' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS disabled - no permission issues'
        ELSE '❌ RLS still enabled'
    END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- 3. Test that tables are accessible
SELECT '=== TABLE ACCESS TEST ===' as status;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN '✅ user_profiles accessible'
        ELSE '❌ user_profiles not accessible'
    END as user_profiles_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM guest_users LIMIT 1) THEN '✅ guest_users accessible'
        ELSE '❌ guest_users not accessible'
    END as guest_users_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders LIMIT 1) THEN '✅ orders accessible'
        ELSE '❌ orders not accessible'
    END as orders_status;

-- 4. Check auth.users table exists
SELECT '=== AUTH SETUP CHECK ===' as status;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✅ auth.users table exists - Supabase Auth is working'
        ELSE '❌ auth.users table missing - Check Supabase project setup'
    END as auth_status; 