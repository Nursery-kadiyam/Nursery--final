-- Fix merchant order linking issues
-- This script fixes orders that might not be properly linked to merchants

-- 1. First, let's see what orders exist and their merchant linking status
SELECT 
    'Current Order Status' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 2. Show recent orders with their merchant linking
SELECT 
    'Recent Orders' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at,
    CASE 
        WHEN parent_order_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as order_type
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Find child orders that don't have merchant_id but have merchant_code
SELECT 
    'Child Orders Missing merchant_id' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at
FROM orders 
WHERE parent_order_id IS NOT NULL 
AND merchant_id IS NULL 
AND merchant_code IS NOT NULL
AND merchant_code != 'admin';

-- 4. Update child orders to have correct merchant_id based on merchant_code
UPDATE orders 
SET merchant_id = (
    SELECT m.id 
    FROM merchants m 
    WHERE m.merchant_code = orders.merchant_code
)
WHERE parent_order_id IS NOT NULL 
AND merchant_id IS NULL 
AND merchant_code IS NOT NULL
AND merchant_code != 'admin'
AND EXISTS (
    SELECT 1 
    FROM merchants m 
    WHERE m.merchant_code = orders.merchant_code
);

-- 5. Show the results after the update
SELECT 
    'After Update - Order Status' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 6. Show updated child orders
SELECT 
    'Updated Child Orders' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at
FROM orders 
WHERE parent_order_id IS NOT NULL 
ORDER BY created_at DESC;

-- 7. Verify merchant dashboard queries will work
-- This shows what each merchant should see
SELECT 
    'Merchant Dashboard Test' as section,
    m.merchant_code,
    m.nursery_name,
    COUNT(o.id) as order_count
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id AND o.parent_order_id IS NOT NULL
GROUP BY m.id, m.merchant_code, m.nursery_name
ORDER BY order_count DESC;

-- 8. Show specific orders for each merchant
SELECT 
    'Orders by Merchant' as section,
    m.merchant_code,
    m.nursery_name,
    o.order_code,
    o.total_amount,
    o.status,
    o.created_at
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id AND o.parent_order_id IS NOT NULL
WHERE o.id IS NOT NULL
ORDER BY m.merchant_code, o.created_at DESC;

