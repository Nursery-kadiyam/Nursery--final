-- Comprehensive Merchant Order Fix
-- This script fixes all merchant order linking issues and ensures proper order split management

-- 1. First, let's see the current state of orders and merchants
SELECT 
    'Current Order Status' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 2. Show all merchants and their codes
SELECT 
    'Merchants' as section,
    id,
    merchant_code,
    nursery_name,
    status
FROM merchants 
ORDER BY created_at DESC;

-- 3. Show recent orders with their merchant linking
SELECT 
    'Recent Orders' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at,
    status,
    total_amount,
    CASE 
        WHEN parent_order_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as order_type
FROM orders 
ORDER BY created_at DESC 
LIMIT 20;

-- 4. Find child orders that don't have merchant_id but have merchant_code
SELECT 
    'Child Orders Missing merchant_id' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at,
    status
FROM orders 
WHERE parent_order_id IS NOT NULL 
AND merchant_id IS NULL 
AND merchant_code IS NOT NULL
AND merchant_code != 'admin'
AND merchant_code != 'parent';

-- 5. Update child orders to have correct merchant_id based on merchant_code
-- This is the main fix for the merchant order visibility issue
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
AND merchant_code != 'parent'
AND EXISTS (
    SELECT 1 
    FROM merchants m 
    WHERE m.merchant_code = orders.merchant_code
);

-- 6. Show the results after the update
SELECT 
    'After Update - Order Status' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 7. Show updated child orders with merchant information
SELECT 
    'Updated Child Orders' as section,
    o.id,
    o.order_code,
    o.merchant_code,
    o.merchant_id,
    o.parent_order_id,
    o.created_at,
    o.status,
    o.total_amount,
    m.nursery_name as merchant_name
FROM orders o
LEFT JOIN merchants m ON m.id = o.merchant_id
WHERE o.parent_order_id IS NOT NULL 
ORDER BY o.created_at DESC;

-- 8. Verify merchant dashboard queries will work
-- This shows what each merchant should see in their dashboard
SELECT 
    'Merchant Dashboard Test' as section,
    m.merchant_code,
    m.nursery_name,
    m.status as merchant_status,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_revenue
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id AND o.parent_order_id IS NOT NULL
GROUP BY m.id, m.merchant_code, m.nursery_name, m.status
ORDER BY order_count DESC;

-- 9. Show specific orders for each merchant (what they should see in dashboard)
SELECT 
    'Orders by Merchant' as section,
    m.merchant_code,
    m.nursery_name,
    o.order_code,
    o.total_amount,
    o.status,
    o.created_at,
    po.order_code as parent_order_code
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id AND o.parent_order_id IS NOT NULL
LEFT JOIN orders po ON po.id = o.parent_order_id
WHERE o.id IS NOT NULL
ORDER BY m.merchant_code, o.created_at DESC;

-- 10. Check for any remaining issues
SELECT 
    'Remaining Issues' as section,
    COUNT(*) as orders_with_issues
FROM orders 
WHERE parent_order_id IS NOT NULL 
AND merchant_id IS NULL 
AND merchant_code IS NOT NULL
AND merchant_code != 'admin'
AND merchant_code != 'parent';

-- 11. Show order split structure (parent-child relationships)
SELECT 
    'Order Split Structure' as section,
    po.order_code as parent_order,
    po.total_amount as parent_total,
    po.created_at as parent_created,
    COUNT(co.id) as child_count,
    COALESCE(SUM(co.total_amount), 0) as children_total
FROM orders po
LEFT JOIN orders co ON co.parent_order_id = po.id
WHERE po.parent_order_id IS NULL
GROUP BY po.id, po.order_code, po.total_amount, po.created_at
ORDER BY po.created_at DESC;

-- 12. Final verification - show what each merchant will see
SELECT 
    'Final Verification - Merchant Orders' as section,
    m.merchant_code,
    m.nursery_name,
    o.order_code,
    o.status,
    o.total_amount,
    o.created_at,
    'This order should be visible in merchant dashboard' as note
FROM merchants m
JOIN orders o ON o.merchant_id = m.id
WHERE o.parent_order_id IS NOT NULL
ORDER BY m.merchant_code, o.created_at DESC;