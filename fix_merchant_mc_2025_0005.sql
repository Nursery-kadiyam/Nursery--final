-- Fix orders for merchant MC-2025-0005
-- This merchant has orders but they're not showing in dashboard

-- 1. Check what orders exist for this merchant
SELECT 
    'Orders for MC-2025-0005' as section,
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
WHERE merchant_code = 'MC-2025-0005'
ORDER BY created_at DESC;

-- 2. Check if merchant exists and get merchant_id
SELECT 
    'Merchant Info' as section,
    id,
    merchant_code,
    nursery_name,
    status
FROM merchants 
WHERE merchant_code = 'MC-2025-0005';

-- 3. Check all recent orders to see the pattern
SELECT 
    'Recent Orders Pattern' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at,
    status
FROM orders 
WHERE created_at >= '2025-09-01'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Fix orders for MC-2025-0005 by setting merchant_id
UPDATE orders 
SET merchant_id = (
    SELECT m.id 
    FROM merchants m 
    WHERE m.merchant_code = 'MC-2025-0005'
)
WHERE merchant_code = 'MC-2025-0005'
AND merchant_id IS NULL;

-- 5. Verify the fix
SELECT 
    'After Fix - Orders for MC-2025-0005' as section,
    id,
    order_code,
    merchant_code,
    merchant_id,
    parent_order_id,
    created_at,
    status,
    total_amount
FROM orders 
WHERE merchant_code = 'MC-2025-0005'
ORDER BY created_at DESC;

-- 6. Check what the merchant dashboard should see
SELECT 
    'Merchant Dashboard Query Test' as section,
    o.id,
    o.order_code,
    o.merchant_code,
    o.merchant_id,
    o.parent_order_id,
    o.created_at,
    o.status,
    o.total_amount,
    m.nursery_name
FROM orders o
JOIN merchants m ON m.id = o.merchant_id
WHERE o.merchant_id = (SELECT id FROM merchants WHERE merchant_code = 'MC-2025-0005')
AND o.parent_order_id IS NOT NULL
ORDER BY o.created_at DESC;