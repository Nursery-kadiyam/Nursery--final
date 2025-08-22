-- Test Orders Data
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CHECK IF ORDERS TABLE EXISTS
-- ========================================
SELECT '=== CHECKING ORDERS TABLE ===' as section;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'orders';

-- ========================================
-- 2. CHECK ORDERS TABLE STRUCTURE
-- ========================================
SELECT '=== ORDERS TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- ========================================
-- 3. CHECK IF THERE ARE ANY ORDERS
-- ========================================
SELECT '=== CHECKING ORDERS DATA ===' as section;

-- Count total orders
SELECT 
    'Total orders' as metric,
    COUNT(*) as value
FROM orders;

-- Check recent orders
SELECT 
    'Recent orders (last 10)' as metric,
    COUNT(*) as value
FROM orders 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ========================================
-- 4. SAMPLE ORDERS DATA
-- ========================================
SELECT '=== SAMPLE ORDERS DATA ===' as section;

-- Show sample orders
SELECT 
    id,
    order_code,
    user_id,
    total_amount,
    status,
    created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================
-- 5. CHECK ORDER_ITEMS TABLE
-- ========================================
SELECT '=== CHECKING ORDER_ITEMS ===' as section;

-- Count order items
SELECT 
    'Total order items' as metric,
    COUNT(*) as value
FROM order_items;

-- Sample order items
SELECT 
    id,
    order_id,
    product_id,
    quantity,
    price,
    created_at
FROM order_items 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================
-- 6. CREATE TEST ORDER (IF NONE EXIST)
-- ========================================
SELECT '=== CREATING TEST ORDER ===' as section;

-- Check if we need to create a test order
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM orders LIMIT 1) THEN
        -- Insert a test order
        INSERT INTO orders (
            user_id,
            delivery_address,
            shipping_address,
            total_amount,
            cart_items,
            status,
            order_code
        ) VALUES (
            'cdabf740-3adc-44b3-8a10-d7063e849816', -- Admin user ID
            '{"name": "Test User", "phone": "1234567890", "addressLine": "Test Address", "city": "Test City", "state": "Test State", "pincode": "123456"}',
            'Test Shipping Address',
            1000.00,
            '[{"id": "test-product", "name": "Test Product", "quantity": 2, "price": 500.00}]',
            'pending',
            'TEST-ORDER-001'
        );
        
        RAISE NOTICE 'Test order created successfully';
    ELSE
        RAISE NOTICE 'Orders already exist, no test order needed';
    END IF;
END $$;

-- ========================================
-- 7. FINAL VERIFICATION
-- ========================================
SELECT '=== FINAL VERIFICATION ===' as section;

-- Final count
SELECT 
    'Final orders count' as metric,
    COUNT(*) as value
FROM orders;

-- Show the test order if it was created
SELECT 
    id,
    order_code,
    user_id,
    total_amount,
    status,
    created_at
FROM orders 
WHERE order_code = 'TEST-ORDER-001';

SELECT 'Orders test completed!' as status;
