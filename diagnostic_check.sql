-- COMPREHENSIVE DIAGNOSTIC CHECK
-- Run this to verify all components are working correctly

-- 1. Check if tables exist
SELECT '=== TABLE EXISTENCE CHECK ===' as check_type;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_profiles', 'guest_users', 'orders') THEN '✅ Found'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'guest_users', 'orders');

-- 2. Check user_profiles table structure
SELECT '=== USER_PROFILES TABLE STRUCTURE ===' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('user_id', 'first_name', 'last_name', 'email', 'phone', 'created_at') THEN '✅ Required column'
        ELSE 'ℹ️ Optional column'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check guest_users table structure
SELECT '=== GUEST_USERS TABLE STRUCTURE ===' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('email', 'first_name', 'last_name', 'phone', 'user_id') THEN '✅ Required column'
        ELSE 'ℹ️ Optional column'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'guest_users'
ORDER BY ordinal_position;

-- 4. Check RLS policies
SELECT '=== RLS POLICIES CHECK ===' as check_type;
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
        WHEN cmd = 'ALL' THEN 'All Operations'
        ELSE cmd
    END as operation,
    CASE 
        WHEN tablename = 'user_profiles' AND cmd = 'INSERT' THEN '⚠️ May cause permission issues'
        WHEN tablename = 'guest_users' AND cmd = 'ALL' THEN '✅ Public access'
        ELSE '✅ Normal policy'
    END as notes
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders')
ORDER BY tablename, cmd;

-- 5. Check if RLS is enabled
SELECT '=== RLS ENABLED CHECK ===' as check_type;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '⚠️ RLS enabled - may cause permission issues'
        ELSE '✅ RLS disabled - no permission issues'
    END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- 6. Check auth.users table exists
SELECT '=== AUTH.USERS TABLE CHECK ===' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✅ auth.users table exists'
        ELSE '❌ auth.users table missing - CRITICAL ISSUE'
    END as auth_users_status;

-- 7. Test insert permissions (this will show actual error messages)
SELECT '=== INSERT PERMISSION TEST ===' as check_type;

-- Test guest_users insert (should work)
DO $$
BEGIN
    BEGIN
        INSERT INTO guest_users (email, first_name, last_name, phone) 
        VALUES ('test@example.com', 'Test', 'User', '1234567890');
        RAISE NOTICE '✅ guest_users insert works';
        DELETE FROM guest_users WHERE email = 'test@example.com';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ guest_users insert failed: %', SQLERRM;
    END;
END $$;

-- 8. Check foreign key constraints
SELECT '=== FOREIGN KEY CHECK ===' as check_type;
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN ccu.table_name = 'users' AND ccu.table_schema = 'auth' THEN '✅ Valid auth.users reference'
        ELSE '⚠️ Check foreign key'
    END as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('user_profiles', 'guest_users', 'orders'); 