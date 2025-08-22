-- CHECK ORDERS AND ORDER_ITEMS SCHEMA AND DATA
-- Run these queries in your Supabase SQL Editor

-- ========================================
-- 1. CHECK ORDERS TABLE SCHEMA
-- ========================================
SELECT '=== ORDERS TABLE SCHEMA ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. CHECK ORDER_ITEMS TABLE SCHEMA
-- ========================================
SELECT '=== ORDER_ITEMS TABLE SCHEMA ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 3. CHECK ORDERS TABLE DATA
-- ========================================
SELECT '=== ORDERS TABLE DATA ===' as section;

SELECT 
    id,
    user_id,
    guest_user_id,
    quotation_id,
    delivery_address,
    shipping_address,
    total_amount,
    status,
    created_at,
    updated_at,
    -- Show cart_items structure (first 200 chars)
    CASE 
        WHEN cart_items IS NOT NULL 
        THEN LEFT(cart_items::text, 200) || '...'
        ELSE 'NULL'
    END as cart_items_preview
FROM orders 
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 4. CHECK ORDER_ITEMS TABLE DATA
-- ========================================
SELECT '=== ORDER_ITEMS TABLE DATA ===' as section;

SELECT 
    id,
    order_id,
    product_id,
    quantity,
    price,
    created_at
FROM order_items 
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 5. CHECK ORDERS COUNT BY USER
-- ========================================
SELECT '=== ORDERS COUNT BY USER ===' as section;

SELECT 
    user_id,
    COUNT(*) as order_count,
    MIN(created_at) as first_order,
    MAX(created_at) as last_order
FROM orders 
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY order_count DESC;

-- ========================================
-- 6. CHECK ORDERS WITH QUOTATIONS
-- ========================================
SELECT '=== ORDERS WITH QUOTATIONS ===' as section;

SELECT 
    o.id as order_id,
    o.user_id,
    o.quotation_id,
    o.status as order_status,
    o.total_amount,
    o.created_at as order_created,
    q.quotation_code,
    q.status as quotation_status,
    q.approved_price
FROM orders o
LEFT JOIN quotations q ON o.quotation_id = q.id
WHERE o.quotation_id IS NOT NULL
ORDER BY o.created_at DESC;

-- ========================================
-- 7. CHECK RECENT ORDERS WITH FULL DETAILS
-- ========================================
SELECT '=== RECENT ORDERS WITH FULL DETAILS ===' as section;

SELECT 
    o.id as order_id,
    o.user_id,
    o.quotation_id,
    o.status,
    o.total_amount,
    o.created_at,
    -- Count order items
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
    -- Show cart items structure
    CASE 
        WHEN o.cart_items IS NOT NULL 
        THEN jsonb_typeof(o.cart_items)
        ELSE 'NULL'
    END as cart_items_type,
    -- Show first cart item if exists
    CASE 
        WHEN o.cart_items IS NOT NULL AND jsonb_array_length(o.cart_items) > 0
        THEN o.cart_items->0
        ELSE 'NULL'
    END as first_cart_item
FROM orders o
ORDER BY o.created_at DESC
LIMIT 5;

-- ========================================
-- 8. CHECK FOR ORDERS WITH SPECIFIC USER
-- ========================================
SELECT '=== CHECK FOR SPECIFIC USER ORDERS ===' as section;

-- Replace 'your-user-id-here' with actual user ID from auth.users
SELECT 
    'Current authenticated user' as info,
    auth.uid() as current_user_id;

-- Check orders for current user
SELECT 
    'Orders for current user' as info,
    COUNT(*) as order_count
FROM orders 
WHERE user_id = auth.uid();

-- Show orders for current user
SELECT 
    id,
    user_id,
    quotation_id,
    status,
    total_amount,
    created_at
FROM orders 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- ========================================
-- 9. CHECK ORDERS TABLE CONSTRAINTS
-- ========================================
SELECT '=== ORDERS TABLE CONSTRAINTS ===' as section;

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders'
AND tc.table_schema = 'public';

-- ========================================
-- 10. CHECK RLS POLICIES
-- ========================================
SELECT '=== RLS POLICIES FOR ORDERS ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- ========================================
-- 11. CHECK ORDERS TABLE INDEXES
-- ========================================
SELECT '=== ORDERS TABLE INDEXES ===' as section;

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders'
AND schemaname = 'public';

-- ========================================
-- 12. SUMMARY REPORT
-- ========================================
SELECT '=== SUMMARY REPORT ===' as section;

SELECT 
    'Total Orders' as metric,
    COUNT(*) as value
FROM orders
UNION ALL
SELECT 
    'Orders with user_id' as metric,
    COUNT(*) as value
FROM orders
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
    'Orders with quotation_id' as metric,
    COUNT(*) as value
FROM orders
WHERE quotation_id IS NOT NULL
UNION ALL
SELECT 
    'Total Order Items' as metric,
    COUNT(*) as value
FROM order_items
UNION ALL
SELECT 
    'Orders created today' as metric,
    COUNT(*) as value
FROM orders
WHERE DATE(created_at) = CURRENT_DATE;
