-- TEMPORARY FIX: Disable RLS to eliminate permission errors
-- ⚠️ WARNING: Only use this for testing. Re-enable RLS for production.

-- Disable RLS on user_profiles table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on guest_users table  
ALTER TABLE guest_users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on orders table
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- This should show rls_enabled = false for all tables 