-- Fix Order Creation Issues
-- Run this in your Supabase SQL editor

-- Step 1: Check current user authentication
SELECT 
    'Current User Check' as test_name,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
        ELSE 'User is not authenticated'
    END as auth_status;

-- Step 2: Check orders table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Step 3: Check order_items table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Step 4: Disable RLS temporarily on both tables
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive RLS policies for orders table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Guests can insert orders" ON orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON orders;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON orders;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for users based on user_id" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Step 6: Create comprehensive RLS policies for order_items table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can update all order items" ON order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_items;
DROP POLICY IF EXISTS "Enable update for users based on order_id" ON order_items;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON order_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for users based on order_id" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()::text
        )
    );

-- Step 7: Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Step 8: Verify policies were created
SELECT 
    'Orders Table Policies' as table_name,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;

SELECT 
    'Order Items Table Policies' as table_name,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;

-- Step 9: Test order creation with a sample order
INSERT INTO orders (
    user_id,
    order_code,
    total_amount,
    status,
    created_at,
    cart_items
) VALUES (
    auth.uid()::text,
    'TEST-ORDER-' || EXTRACT(EPOCH FROM NOW())::integer,
    1000.00,
    'pending',
    NOW(),
    '[{"product_id": 1, "quantity": 2, "price": 500.00}]'
) ON CONFLICT DO NOTHING;

-- Step 10: Show the test order
SELECT 
    id,
    user_id,
    order_code,
    total_amount,
    status,
    created_at
FROM orders 
WHERE order_code LIKE 'TEST-ORDER-%'
ORDER BY created_at DESC 
LIMIT 5;

-- Step 11: Clean up test data
DELETE FROM orders WHERE order_code LIKE 'TEST-ORDER-%';
