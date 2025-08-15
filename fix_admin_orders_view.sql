-- Fix Admin Orders View Issues
-- Run this in your Supabase SQL editor

-- Step 1: Check if admin user exists and has proper role
SELECT 
    'Admin User Check' as test_name,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE user_id = 'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b';

-- Step 2: Check current orders in the database
SELECT 
    'Current Orders' as test_name,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
FROM orders;

-- Step 3: Show all orders with details
SELECT 
    id,
    user_id,
    order_code,
    total_amount,
    status,
    created_at,
    cart_items
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 4: Check RLS policies on orders table for admin access
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

-- Step 5: Fix admin access to orders by updating RLS policies
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for all users" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for users based on user_id" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Step 6: Check if there are any orders with null user_id (guest orders)
SELECT 
    'Guest Orders Check' as test_name,
    COUNT(*) as guest_orders_count
FROM orders 
WHERE user_id IS NULL;

-- Step 7: Test admin access by simulating admin user
-- First, let's check what the current user can see
SELECT 
    'Current User Orders Access' as test_name,
    COUNT(*) as accessible_orders
FROM orders;

-- Step 8: Create a test order if none exist
INSERT INTO orders (
    user_id,
    order_code,
    total_amount,
    status,
    created_at,
    cart_items
) VALUES (
    'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b',
    'TEST-ADMIN-ORDER-' || EXTRACT(EPOCH FROM NOW())::integer,
    2500.00,
    'pending',
    NOW(),
    '[{"product_id": 1, "quantity": 3, "price": 833.33}]'
) ON CONFLICT DO NOTHING;

-- Step 9: Verify the test order was created
SELECT 
    'Test Order Verification' as test_name,
    id,
    user_id,
    order_code,
    total_amount,
    status,
    created_at
FROM orders 
WHERE order_code LIKE 'TEST-ADMIN-ORDER-%'
ORDER BY created_at DESC 
LIMIT 5;

-- Step 10: Show final orders count
SELECT 
    'Final Orders Summary' as test_name,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
FROM orders;
