-- TEST: Verify the database function is returning correct data for ORD-2025-0005
-- This will help identify if the issue is in the database or frontend

-- 1. Test the merchant function directly
SELECT 
    'Merchant Function Test' as test_type,
    order_code,
    buyer_reference,
    status,
    total_amount,
    items_count,
    order_items
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- 2. Check the raw order_items data
SELECT 
    'Raw Order Items Check' as test_type,
    oi.id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.merchant_code,
    p.name as product_name,
    p.image_url as product_image_url
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

-- 3. Test the specific order details function
SELECT 
    'Order Details Function Test' as test_type,
    order_code,
    buyer_reference,
    status,
    total_amount,
    order_items
FROM get_merchant_order_details(
    (SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'),
    'MC-2025-TXYR'
);

-- 4. Check if the JSON structure is correct
SELECT 
    'JSON Structure Check' as test_type,
    jsonb_pretty(order_items) as formatted_order_items
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- 5. Verify the products exist and have correct data
SELECT 
    'Products Verification' as test_type,
    p.id,
    p.name,
    p.image_url,
    p.merchant_code,
    CASE 
        WHEN p.name IS NULL OR p.name = '' THEN 'NO NAME'
        WHEN p.image_url IS NULL OR p.image_url = '' THEN 'NO IMAGE'
        ELSE 'COMPLETE'
    END as product_status
FROM products p
WHERE p.id IN (
    SELECT DISTINCT oi.product_id 
    FROM order_items oi 
    WHERE oi.order_id = (SELECT id FROM orders WHERE order_code = 'ORD-2025-0005')
);