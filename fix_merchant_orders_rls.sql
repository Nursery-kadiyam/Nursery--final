-- Fix RLS policies for merchant orders access
-- This ensures merchants can see their orders properly

-- First, let's check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('orders', 'user_profiles', 'order_items');

-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('orders', 'user_profiles', 'order_items')
ORDER BY tablename, policyname;

-- Create comprehensive RLS policies for orders table
-- Drop existing policies first
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update orders" ON orders;

-- Create new comprehensive policies for orders
CREATE POLICY "Merchants can view their orders" ON orders
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code 
            FROM merchants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can update their orders" ON orders
    FOR UPDATE
    USING (
        merchant_code IN (
            SELECT merchant_code 
            FROM merchants 
            WHERE user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (needed for merchant order queries)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT
    USING (id = auth.uid());

-- Create policies for order_items
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;

CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can view order items for their orders" ON order_items
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code 
            FROM merchants 
            WHERE user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Test query to verify merchant can see their orders
-- Replace 'MC-2025-TXYR' with actual merchant code
SELECT 
    o.id,
    o.order_code,
    o.merchant_code,
    o.status,
    o.total_amount,
    o.created_at,
    up.first_name,
    up.last_name,
    up.email
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
WHERE o.merchant_code = 'MC-2025-TXYR'
ORDER BY o.created_at DESC;