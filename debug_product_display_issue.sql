-- DEBUG: Analyze why some orders show product names/images while others don't
-- This will help identify the root cause of inconsistent display

-- 1. Check order_items data for ORD-2025-0005 (the problematic one)
SELECT 
    'ORD-2025-0005 Order Items Check' as check_type,
    oi.id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.merchant_code,
    p.name as product_name,
    p.image_url as product_image,
    CASE 
        WHEN p.id IS NULL THEN 'NO PRODUCT LINK'
        WHEN p.name IS NULL THEN 'NO PRODUCT NAME'
        WHEN p.image_url IS NULL THEN 'NO PRODUCT IMAGE'
        ELSE 'COMPLETE PRODUCT DATA'
    END as product_status
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

-- 2. Check order_items data for ORD-2025-0004 (the working one)
SELECT 
    'ORD-2025-0004 Order Items Check' as check_type,
    oi.id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.merchant_code,
    p.name as product_name,
    p.image_url as product_image,
    CASE 
        WHEN p.id IS NULL THEN 'NO PRODUCT LINK'
        WHEN p.name IS NULL THEN 'NO PRODUCT NAME'
        WHEN p.image_url IS NULL THEN 'NO PRODUCT IMAGE'
        ELSE 'COMPLETE PRODUCT DATA'
    END as product_status
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0004'
);

-- 3. Test the merchant function output for ORD-2025-0005
SELECT 
    'Merchant Function Test for ORD-2025-0005' as check_type,
    *
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- 4. Test the merchant function output for ORD-2025-0004
SELECT 
    'Merchant Function Test for ORD-2025-0004' as check_type,
    *
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0004';

-- 5. Check if products exist for the missing product_ids
SELECT 
    'Missing Products Check' as check_type,
    oi.product_id,
    p.name,
    p.image_url,
    CASE 
        WHEN p.id IS NULL THEN 'PRODUCT NOT FOUND'
        ELSE 'PRODUCT EXISTS'
    END as product_exists
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id IN (
    SELECT id FROM orders WHERE order_code IN ('ORD-2025-0005', 'ORD-2025-0004')
)
AND p.id IS NULL;

-- 6. Check all products for merchant MC-2025-TXYR
SELECT 
    'Merchant Products Check' as check_type,
    id,
    name,
    image_url,
    merchant_code
FROM products
WHERE merchant_code = 'MC-2025-TXYR';

-- 7. Check cart_items for ORD-2025-0005 to see original data
SELECT 
    'ORD-2025-0005 Cart Items Check' as check_type,
    order_code,
    cart_items,
    CASE 
        WHEN cart_items IS NULL THEN 'NULL'
        WHEN cart_items = '[]'::jsonb THEN 'EMPTY ARRAY'
        WHEN cart_items::text = 'order_items' THEN 'INVALID STRING'
        ELSE 'VALID JSON'
    END as cart_items_status
FROM orders
WHERE order_code = 'ORD-2025-0005';

-- 8. Compare order_items count vs cart_items count
SELECT 
    'Order Items vs Cart Items Comparison' as check_type,
    o.order_code,
    o.merchant_code,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as order_items_count,
    CASE 
        WHEN o.cart_items IS NULL THEN 0
        WHEN o.cart_items = '[]'::jsonb THEN 0
        ELSE jsonb_array_length(o.cart_items)
    END as cart_items_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) = 0 
        THEN 'NO ORDER ITEMS - NEEDS POPULATION'
        WHEN (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) = CASE 
            WHEN o.cart_items IS NULL THEN 0
            WHEN o.cart_items = '[]'::jsonb THEN 0
            ELSE jsonb_array_length(o.cart_items)
        END
        THEN 'MATCHED'
        ELSE 'MISMATCH'
    END as status
FROM orders o
WHERE o.order_code IN ('ORD-2025-0005', 'ORD-2025-0004')
ORDER BY o.created_at;