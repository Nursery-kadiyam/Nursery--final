-- Complete Auto Confirm Orders Fix
-- This script updates all existing orders to confirmed status and ensures new orders are auto-confirmed

-- 1. Update all existing pending orders to confirmed
UPDATE orders 
SET status = 'confirmed' 
WHERE status = 'pending';

-- 2. Update all existing pending orders in order_items table (if applicable)
UPDATE order_items 
SET status = 'confirmed' 
WHERE status = 'pending';

-- 3. Verify the updates
SELECT 
    'Orders Status Distribution' as table_name,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
UNION ALL
SELECT 
    'Order Items Status Distribution' as table_name,
    COALESCE(status, 'no_status') as status,
    COUNT(*) as count
FROM order_items 
GROUP BY COALESCE(status, 'no_status')
ORDER BY table_name, status;

-- 4. Show recent orders to verify the fix
SELECT 
    order_code,
    status,
    total_amount,
    created_at,
    merchant_code
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;