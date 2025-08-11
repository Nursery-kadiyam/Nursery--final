-- Test script to verify database setup
-- Run this in your Supabase SQL Editor after running the main setup

-- 1. Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_profiles', 'guest_users', 'orders') THEN '✅ Found'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'guest_users', 'orders');

-- 2. Check RLS policies
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
    END as operation
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders')
ORDER BY tablename, cmd;

-- 3. Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'guest_users', 'orders')
ORDER BY table_name, ordinal_position;

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- 5. Test guest_users table access (should work without authentication)
-- This should return an empty result set, not an error
SELECT COUNT(*) as guest_users_count FROM guest_users;

-- 6. Check if auth.users table exists (required for foreign key references)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✅ auth.users table exists'
        ELSE '❌ auth.users table missing'
    END as auth_users_status; 