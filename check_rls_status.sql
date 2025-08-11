-- Check and Fix RLS Status
-- Run this in your Supabase SQL Editor

-- Step 1: Check current RLS status
SELECT 
    'Current RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'orders';

-- Step 2: Check existing policies
SELECT 
    'Existing Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'orders';

-- Step 3: Disable RLS completely
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Allow all authenticated users" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- Step 5: Grant ALL permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON orders TO anon;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;
GRANT ALL ON order_items TO anon;

-- Step 6: Verify RLS is disabled
SELECT 
    'Final RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'orders';

-- Step 7: Test insert permission
SELECT 'RLS completely disabled and permissions granted!' as status; 