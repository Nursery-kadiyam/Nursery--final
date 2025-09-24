-- Debug merchant orders issue
-- Check if orders exist for the merchant

-- First, check all orders in the database
SELECT 
    id, 
    order_code, 
    merchant_code, 
    status, 
    total_amount,
    created_at,
    user_id
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any orders for MC-2025-TXYR specifically
SELECT 
    id, 
    order_code, 
    merchant_code, 
    status, 
    total_amount,
    created_at,
    user_id
FROM orders 
WHERE merchant_code = 'MC-2025-TXYR'
ORDER BY created_at DESC;

-- Check if the merchant exists in the merchants table
SELECT 
    id,
    merchant_code,
    nursery_name,
    user_id,
    status
FROM merchants 
WHERE merchant_code = 'MC-2025-TXYR';

-- Check RLS policies on orders table
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders';

-- Test a simple query that should work
SELECT COUNT(*) as total_orders FROM orders;
SELECT COUNT(*) as merchant_orders FROM orders WHERE merchant_code = 'MC-2025-TXYR';