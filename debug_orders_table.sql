-- Debug Orders Table
-- Run this in your Supabase SQL editor

-- Step 1: Check if orders table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Step 2: Check if order_items table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Step 3: Check RLS policies on orders table
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

-- Step 4: Check RLS policies on order_items table
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
WHERE tablename = 'order_items';

-- Step 5: Count total orders
SELECT 
    'Total Orders' as metric,
    COUNT(*) as count
FROM orders;

-- Step 6: Show all orders (if any exist)
SELECT 
    id,
    order_code,
    user_id,
    total_amount,
    status,
    created_at,
    cart_items
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 7: Count total order items
SELECT 
    'Total Order Items' as metric,
    COUNT(*) as count
FROM order_items;

-- Step 8: Show all order items (if any exist)
SELECT 
    id,
    order_id,
    product_id,
    quantity,
    price,
    created_at
FROM order_items 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 9: Check for any sample data or test orders
SELECT 
    'Sample Orders Check' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Orders found'
        ELSE 'No orders found'
    END as result,
    COUNT(*) as order_count
FROM orders;

-- Step 10: Create a sample order for testing (if no orders exist)
INSERT INTO orders (order_code, user_id, total_amount, status, created_at, cart_items)
SELECT 
    'TEST-ORDER-001',
    'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b',
    1500.00,
    'pending',
    NOW(),
    '[{"product_id": 1, "quantity": 2, "price": 750.00}]'
WHERE NOT EXISTS (SELECT 1 FROM orders LIMIT 1);
