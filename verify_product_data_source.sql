-- VERIFY PRODUCT DATA SOURCE
-- This checks if product names are coming from real-time data or hardcoded

-- ========================================
-- 1. CHECK ORDER_ITEMS DATA
-- ========================================
SELECT 
    'Order Items Data Check' as check_type,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    (oi.quotation_specifications->>'product_name')::text as extracted_name,
    (oi.quotation_specifications->>'image')::text as extracted_image,
    o.order_code
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.quotation_item_index;

-- ========================================
-- 2. CHECK QUOTATION DATA
-- ========================================
SELECT 
    'Quotation Data Check' as check_type,
    q.quotation_code,
    q.items,
    jsonb_array_elements(q.items) as item
FROM quotations q
WHERE q.quotation_code = 'QC-2025-0025';

-- ========================================
-- 3. TEST RPC FUNCTION OUTPUT
-- ========================================
SELECT 
    'RPC Function Test' as check_type,
    order_id,
    order_code,
    jsonb_pretty(order_items) as formatted_order_items
FROM get_merchant_orders_with_products('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- ========================================
-- 4. CHECK IF PRODUCTS TABLE HAS IMAGES
-- ========================================
SELECT 
    'Products Table Check' as check_type,
    p.id,
    p.name,
    p.image_url,
    p.merchant_code
FROM products p
WHERE p.merchant_code = 'MC-2025-TXYR';