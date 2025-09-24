-- Comprehensive fix for all merchant orders
-- This will fix the merchant dashboard order visibility issue

-- 1. First, let's see the current state
SELECT 
    'Current State' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 2. Show all merchants
SELECT 
    'All Merchants' as section,
    id,
    merchant_code,
    nursery_name,
    status
FROM merchants 
ORDER BY created_at DESC;

-- 3. Show orders that need fixing (child orders without merchant_id)
SELECT 
    'Orders Needing Fix' as section,
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
AND merchant_code != 'parent'
ORDER BY created_at DESC;

-- 4. Fix all child orders by setting merchant_id based on merchant_code
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

-- 5. Show results after fix
SELECT 
    'After Fix - Order Status' as section,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NOT NULL THEN 1 END) as child_orders_with_merchant_id,
    COUNT(CASE WHEN parent_order_id IS NOT NULL AND merchant_id IS NULL THEN 1 END) as child_orders_without_merchant_id
FROM orders;

-- 6. Show fixed orders for each merchant
SELECT 
    'Fixed Orders by Merchant' as section,
    m.merchant_code,
    m.nursery_name,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_revenue
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id AND o.parent_order_id IS NOT NULL
GROUP BY m.id, m.merchant_code, m.nursery_name
ORDER BY order_count DESC;

-- 7. Show specific orders for MC-2025-0005 (the problematic merchant)
SELECT 
    'MC-2025-0005 Orders' as section,
    o.id,
    o.order_code,
    o.merchant_code,
    o.merchant_id,
    o.parent_order_id,
    o.created_at,
    o.status,
    o.total_amount,
    po.order_code as parent_order_code
FROM orders o
LEFT JOIN orders po ON po.id = o.parent_order_id
WHERE o.merchant_code = 'MC-2025-0005'
ORDER BY o.created_at DESC;

-- 8. Test merchant dashboard query for MC-2025-0005
SELECT 
    'Merchant Dashboard Test for MC-2025-0005' as section,
    o.id,
    o.order_code,
    o.merchant_code,
    o.merchant_id,
    o.parent_order_id,
    o.created_at,
    o.status,
    o.total_amount
FROM orders o
WHERE o.merchant_id = (SELECT id FROM merchants WHERE merchant_code = 'MC-2025-0005')
AND o.parent_order_id IS NOT NULL
ORDER BY o.created_at DESC;