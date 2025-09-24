-- FIX REMAINING UNKNOWN PRODUCTS
-- This script identifies and fixes any remaining "Unknown Product" entries

-- ========================================
-- 1. IDENTIFY UNKNOWN PRODUCTS
-- ========================================

-- Check which order_items still have "Unknown Product"
SELECT 
    'IDENTIFYING UNKNOWN PRODUCTS' as info,
    oi.id,
    oi.product_id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.quantity,
    oi.price,
    oi.subtotal,
    o.order_code,
    o.merchant_code
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.quotation_product_name = 'Unknown Product' 
   OR oi.quotation_product_name IS NULL
   OR oi.quotation_product_image = '/assets/placeholder.svg'
ORDER BY oi.created_at DESC;

-- ========================================
-- 2. CHECK IF PRODUCTS EXIST FOR THESE ITEMS
-- ========================================

-- Check if there are products that match these order_items
SELECT 
    'CHECKING PRODUCT MATCHES' as info,
    oi.id as order_item_id,
    oi.product_id,
    p.name as product_name,
    p.image_url as product_image,
    oi.quotation_product_name as current_name,
    oi.quotation_product_image as current_image
FROM order_items oi
LEFT JOIN products p ON p.id = oi.product_id
WHERE oi.quotation_product_name = 'Unknown Product' 
   OR oi.quotation_product_name IS NULL
ORDER BY oi.created_at DESC;

-- ========================================
-- 3. UPDATE REMAINING UNKNOWN PRODUCTS
-- ========================================

-- Update any remaining unknown products with actual product data
UPDATE order_items oi
SET quotation_product_name = COALESCE(p.name, 'Unknown Product'),
    quotation_product_image = COALESCE(p.image_url, '/assets/placeholder.svg'),
    subtotal = COALESCE(oi.price * oi.quantity, oi.subtotal)
FROM products p
WHERE oi.product_id = p.id
  AND (oi.quotation_product_name = 'Unknown Product' 
       OR oi.quotation_product_name IS NULL
       OR oi.quotation_product_image = '/assets/placeholder.svg');

-- ========================================
-- 4. VERIFY THE FIX
-- ========================================

-- Check if all unknown products are now fixed
SELECT 
    'VERIFICATION - CHECKING FIXED PRODUCTS' as info,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.subtotal,
    o.order_code
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.quotation_product_name IS NOT NULL
  AND oi.quotation_product_name != 'Unknown Product'
ORDER BY oi.created_at DESC
LIMIT 10;

-- ========================================
-- 5. TEST THE MERCHANT FUNCTION
-- ========================================

-- Test the merchant function to see if it now returns proper data
SELECT 
    'TESTING MERCHANT FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count,
    order_items
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;