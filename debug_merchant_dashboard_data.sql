-- DEBUG MERCHANT DASHBOARD DATA ISSUE
-- This helps identify why product names and images aren't showing

-- ========================================
-- 1. CHECK THE ACTUAL DATA BEING RETURNED BY FUNCTIONS
-- ========================================
SELECT 'Testing get_merchant_orders_with_products function' as test_type;

-- Test with the specific merchant code
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');

-- ========================================
-- 2. CHECK ORDER ITEMS WITH PRODUCT DATA
-- ========================================
SELECT 
    'Order Items with Product Data' as check_type,
    oi.id,
    oi.order_id,
    oi.merchant_code,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    p.name as product_name,
    p.image_url as product_image_url,
    o.order_code
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE oi.merchant_code = 'MC-2025-TXYR'
ORDER BY oi.created_at DESC;

-- ========================================
-- 3. CHECK SPECIFIC ORDER ORD-2025-0005
-- ========================================
SELECT 
    'Order ORD-2025-0005 Details' as check_type,
    o.id,
    o.order_code,
    o.merchant_code,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
WHERE o.order_code = 'ORD-2025-0005';

-- Check order items for this specific order
SELECT 
    'Order Items for ORD-2025-0005' as check_type,
    oi.id,
    oi.order_id,
    oi.merchant_code,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    p.name as product_name,
    p.image_url as product_image_url
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005';

-- ========================================
-- 4. TEST THE ORDER DETAILS FUNCTION
-- ========================================
-- First get the order ID for ORD-2025-0005
SELECT 
    'Order ID for ORD-2025-0005' as check_type,
    id as order_id
FROM orders 
WHERE order_code = 'ORD-2025-0005';

-- Then test the order details function with that ID
-- (Replace the UUID below with the actual order ID from above)
SELECT 'Testing get_merchant_order_details function' as test_type;
-- SELECT * FROM get_merchant_order_details('REPLACE_WITH_ACTUAL_ORDER_ID', 'MC-2025-TXYR');

-- ========================================
-- 5. CHECK IF PRODUCTS HAVE NAMES AND IMAGES
-- ========================================
SELECT 
    'Products Check' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as products_with_images,
    COUNT(CASE WHEN merchant_code = 'MC-2025-TXYR' THEN 1 END) as products_for_merchant
FROM products;

-- Show sample products for the merchant
SELECT 
    'Sample Products for MC-2025-TXYR' as check_type,
    id,
    name,
    image_url,
    merchant_code
FROM products 
WHERE merchant_code = 'MC-2025-TXYR'
LIMIT 5;