-- DEBUG PRODUCT LINKING ISSUE
-- This helps identify why products are showing as "Unknown Product"

-- ========================================
-- 1. CHECK THE ACTUAL DATA IN ORDER_ITEMS
-- ========================================
SELECT 
    'Order Items with Product Data' as check_type,
    oi.id as order_item_id,
    oi.order_id,
    oi.merchant_code,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    p.name as product_name,
    p.image_url as product_image_url,
    o.order_code
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.created_at DESC;

-- ========================================
-- 2. CHECK WHAT THE FUNCTION IS RETURNING
-- ========================================
SELECT 'Testing get_merchant_orders_with_products function' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');

-- ========================================
-- 3. CHECK IF PRODUCTS EXIST FOR THE MERCHANT
-- ========================================
SELECT 
    'Products for MC-2025-TXYR' as check_type,
    id,
    name,
    image_url,
    merchant_code
FROM products 
WHERE merchant_code = 'MC-2025-TXYR'
ORDER BY created_at DESC;

-- ========================================
-- 4. CHECK IF ORDER_ITEMS HAVE PRODUCT_ID
-- ========================================
SELECT 
    'Order Items Product IDs' as check_type,
    oi.id,
    oi.product_id,
    oi.merchant_code,
    CASE 
        WHEN oi.product_id IS NULL THEN 'NULL - No product linked'
        WHEN oi.product_id IS NOT NULL THEN 'Has product_id: ' || oi.product_id::text
    END as product_status
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005';

-- ========================================
-- 5. CHECK IF PRODUCTS MATCH THE MERCHANT
-- ========================================
SELECT 
    'Product-Merchant Matching' as check_type,
    p.id as product_id,
    p.name as product_name,
    p.merchant_code as product_merchant,
    oi.merchant_code as order_item_merchant,
    CASE 
        WHEN p.merchant_code = oi.merchant_code THEN 'MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005';