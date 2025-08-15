-- Fix Orders Table RLS Policies
-- Run this in your Supabase SQL editor

-- Step 1: Check current RLS status on orders table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'orders';

-- Step 2: Check existing RLS policies on orders table
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

-- Step 3: Disable RLS temporarily to allow order creation
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 4: Create proper RLS policies for orders table

-- Policy for users to view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for users to insert their own orders
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy for admins to view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for admins to update all orders
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for guests to insert orders (for guest checkout)
DROP POLICY IF EXISTS "Guests can insert orders" ON orders;
CREATE POLICY "Guests can insert orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Step 5: Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify the policies were created
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
WHERE tablename = 'orders'
ORDER BY policyname;

-- Step 7: Check if orders table has the correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Step 8: Test order creation with current user
SELECT 
    'Current user ID' as test_name,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
        ELSE 'User is not authenticated'
    END as auth_status;
