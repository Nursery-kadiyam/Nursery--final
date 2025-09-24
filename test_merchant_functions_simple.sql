-- SIMPLE TEST FOR MERCHANT FUNCTIONS
-- This tests the functions to ensure they work correctly

-- ========================================
-- 1. TEST PRIMARY FUNCTION
-- ========================================

SELECT 
    'TESTING PRIMARY FUNCTION' as test_type,
    order_code,
    total_amount,
    status,
    items_count,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;

-- ========================================
-- 2. TEST ORDER DETAILS FUNCTION
-- ========================================

SELECT 
    'TESTING ORDER DETAILS FUNCTION' as test_type,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_order_details(
    (SELECT id FROM orders WHERE merchant_code = 'MC-2025-TXYR' LIMIT 1),
    'MC-2025-TXYR'
);

-- ========================================
-- 3. TEST FALLBACK FUNCTION
-- ========================================

SELECT 
    'TESTING FALLBACK FUNCTION' as test_type,
    order_code,
    total_amount,
    status,
    items_count,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_cart_items('MC-2025-TXYR')
LIMIT 3;

-- ========================================
-- 4. TEST QUOTATION DATA FUNCTION
-- ========================================

SELECT 
    'TESTING QUOTATION DATA FUNCTION' as test_type,
    order_code,
    total_amount,
    status,
    items_count,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_quotation_data('MC-2025-TXYR')
LIMIT 3;

-- ========================================
-- 5. CHECK FUNCTION SIGNATURES
-- ========================================

SELECT 
    'FUNCTION SIGNATURES' as info,
    proname as function_name,
    proargnames as parameters,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
    'get_merchant_orders_with_products', 
    'get_merchant_order_details', 
    'get_merchant_orders_with_cart_items',
    'get_merchant_orders_with_quotation_data'
)
ORDER BY proname;