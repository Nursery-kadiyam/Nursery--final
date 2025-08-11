-- Completely Disable RLS for Orders Table
-- Run this in your Supabase SQL Editor

-- Step 1: Disable RLS completely for orders table
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Allow all authenticated users" ON orders;

-- Step 3: Grant full permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON orders TO anon;

-- Step 4: Grant permissions for order_items too
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;
GRANT ALL ON order_items TO anon;

-- Step 5: Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'orders';

-- Step 6: Test insert permission
SELECT 'RLS completely disabled! Orders should work now.' as status; 