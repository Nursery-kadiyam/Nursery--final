-- RE-ENABLE RLS for production
-- Run this when you're ready to secure your database

-- Re-enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on guest_users table  
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'guest_users', 'orders');

-- This should show rls_enabled = true for all tables 