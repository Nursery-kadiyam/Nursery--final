-- Verify Price Calculation Fix
-- This script checks the current state of price calculations

-- ========================================
-- 1. CHECK CURRENT ORDER_ITEMS STATE
-- ========================================

SELECT 
    'Current order_items with price issues:' as info,
    oi.id,
    oi.order_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    oi.subtotal,
    o.order_code,
    o.quotation_code,
    CASE 
        WHEN oi.unit_price IS NULL THEN 'NULL unit_price'
        WHEN oi.unit_price = 0 THEN 'ZERO unit_price'
        WHEN (oi.unit_price * oi.quantity) != oi.price THEN 'INCORRECT calculation'
        ELSE 'CORRECT'
    END as issue_type
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.unit_price IS NULL 
   OR oi.unit_price = 0
   OR (oi.unit_price * oi.quantity) != oi.price
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 2. CHECK RECENT ORDERS
-- ========================================

SELECT 
    'Recent orders with items:' as info,
    o.order_code,
    o.total_amount,
    o.created_at,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price) as total_price,
    AVG(oi.unit_price) as avg_unit_price
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_code, o.total_amount, o.created_at
ORDER BY o.created_at DESC
LIMIT 5;

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
    (oi.unit_price * oi.quantity) as calculated_total,
    CASE 
        WHEN (oi.unit_price * oi.quantity) = oi.price THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as calculation_status
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC, oi.id
LIMIT 10;

-- ========================================
-- 4. CHECK QUOTATION PRICES
-- ========================================

SELECT 
    'Quotation unit prices:' as info,
    q.quotation_code,
    q.unit_prices,
    q.total_quote_price,
    q.created_at
FROM quotations q
WHERE q.created_at >= NOW() - INTERVAL '7 days'
ORDER BY q.created_at DESC
LIMIT 5;