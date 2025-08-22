-- Fix Admin Access to Orders Table
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT RLS POLICIES
-- ========================================
SELECT '=== CHECKING CURRENT RLS POLICIES ===' as section;

-- Check if RLS is enabled on orders table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'orders';

-- Check existing policies on orders table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- ========================================
-- 2. CHECK IF ADMIN USER EXISTS
-- ========================================
SELECT '=== CHECKING ADMIN USER ===' as section;

-- Check if the admin user exists in user_profiles
SELECT 
    id,
    email,
    role,
    first_name,
    last_name
FROM user_profiles 
WHERE role = 'admin';

-- ========================================
-- 3. CREATE ADMIN POLICY FOR ORDERS
-- ========================================
SELECT '=== CREATING ADMIN POLICY ===' as section;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

-- Create comprehensive admin policy for orders table
CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- ========================================
-- 4. CREATE ADMIN POLICY FOR ORDER_ITEMS
-- ========================================
SELECT '=== CREATING ADMIN POLICY FOR ORDER_ITEMS ===' as section;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- Create comprehensive admin policy for order_items table
CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- ========================================
-- 5. VERIFY POLICIES
-- ========================================
SELECT '=== VERIFYING POLICIES ===' as section;

-- Check all policies on orders table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;

-- Check all policies on order_items table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;

-- ========================================
-- 6. TEST ADMIN ACCESS
-- ========================================
SELECT '=== TESTING ADMIN ACCESS ===' as section;

-- Test query to see if admin can access orders
-- (This will be run by the admin user)
SELECT 
    'Orders count' as test,
    COUNT(*) as result
FROM orders;

SELECT 
    'Order items count' as test,
    COUNT(*) as result
FROM order_items;

-- ========================================
-- 7. DISABLE RLS TEMPORARILY (IF NEEDED)
-- ========================================
SELECT '=== OPTION: DISABLE RLS TEMPORARILY ===' as section;

-- Uncomment the following lines if you want to disable RLS temporarily for testing
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, use:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

SELECT 'Admin access fix completed!' as status;
