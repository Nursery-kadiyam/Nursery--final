-- Verify Total Amount Calculation Fix
-- This script checks the current state of total amount calculations

-- ========================================
-- 1. CHECK ORDERS WITH INCORRECT TOTALS
-- ========================================

SELECT 
    'Orders with incorrect total_amount:' as info,
    o.id,
    o.order_code,
    o.total_amount as order_total,
    SUM(oi.price) as calculated_total,
    o.total_amount - SUM(oi.price) as difference,
    o.created_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.total_amount, o.created_at
HAVING o.total_amount != SUM(oi.price)
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 2. CHECK RECENT ORDERS
-- ========================================

SELECT 
    'Recent orders with totals:' as info,
    o.order_code,
    o.total_amount,
    COUNT(oi.id) as item_count,
    SUM(oi.price) as calculated_total,
    CASE 
        WHEN o.total_amount = SUM(oi.price) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_code, o.total_amount
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 3. CHECK SPECIFIC ORDER ITEMS
-- ========================================

SELECT 
    'Order items for recent orders:' as info,
    o.order_code,
    oi.quantity,
    oi.unit_price,
    oi.price,
    oi.subtotal,
    (oi.unit_price * oi.quantity) as calculated_price,
    CASE 
        WHEN oi.price = (oi.unit_price * oi.quantity) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as item_status
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC, oi.id
LIMIT 10;

-- ========================================
-- 4. CHECK ORDER TOTALS BY MERCHANT
-- ========================================

SELECT 
    'Order totals by merchant:' as info,
    o.merchant_code,
    o.order_code,
    o.total_amount,
    SUM(oi.price) as calculated_total,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.merchant_code, o.order_code, o.total_amount, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;