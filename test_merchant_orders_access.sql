-- Test merchant orders access
-- Replace 'MC-2025-TXYR' with the actual merchant code

-- Check if orders exist for the merchant
SELECT 
    id, 
    order_code, 
    merchant_code, 
    status, 
    total_amount,
    created_at
FROM orders 
WHERE merchant_code = 'MC-2025-TXYR'
ORDER BY created_at DESC;

-- Check RLS policies on orders table
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

-- Check if user_profiles table has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('orders', 'user_profiles', 'order_items');

-- Test direct query that should work
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