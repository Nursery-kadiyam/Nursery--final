-- QUICK ORDERS CHECK - Run these queries in Supabase SQL Editor

-- 1. Check orders table structure
SELECT 'ORDERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Check order_items table structure  
SELECT 'ORDER_ITEMS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- 3. Check if orders exist
SELECT 'TOTAL ORDERS:' as info, COUNT(*) as count FROM orders;

-- 4. Check orders with user_id
SELECT 'ORDERS WITH USER_ID:' as info, COUNT(*) as count 
FROM orders WHERE user_id IS NOT NULL;

-- 5. Check orders with quotation_id
SELECT 'ORDERS WITH QUOTATION_ID:' as info, COUNT(*) as count 
FROM orders WHERE quotation_id IS NOT NULL;

-- 6. Show recent orders
SELECT 'RECENT ORDERS:' as info;
SELECT id, user_id, quotation_id, status, total_amount, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check current user orders
SELECT 'CURRENT USER ORDERS:' as info;
SELECT COUNT(*) as count 
FROM orders 
WHERE user_id = auth.uid();

-- 8. Show current user orders
SELECT id, user_id, quotation_id, status, total_amount, created_at 
FROM orders 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
