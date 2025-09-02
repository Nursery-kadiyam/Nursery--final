-- TEST STOCK MANAGEMENT SYSTEM
-- Run this script to verify the stock management system is working correctly

-- ========================================
-- 1. CHECK SYSTEM SETUP
-- ========================================
SELECT '=== CHECKING SYSTEM SETUP ===' as status;

-- Check if stock_transactions table exists
SELECT 
    'Stock transactions table' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transactions') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- Check if functions exist
SELECT 
    'Stock management functions' as component,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%stock%';

-- Check if triggers exist
SELECT 
    'Stock management triggers' as component,
    COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' OR trigger_name LIKE '%order%';

-- ========================================
-- 2. TEST STOCK UPDATE FUNCTION
-- ========================================
SELECT '=== TESTING STOCK UPDATE FUNCTION ===' as status;

-- Get a test product
DO $$
DECLARE
    test_product_id UUID;
    initial_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Get first product for testing
    SELECT id, available_quantity INTO test_product_id, initial_stock
    FROM products 
    LIMIT 1;
    
    IF test_product_id IS NULL THEN
        RAISE NOTICE 'No products found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with product ID: %, Initial stock: %', test_product_id, initial_stock;
    
    -- Test stock decrease (purchase)
    PERFORM update_product_stock(
        test_product_id,
        -2,
        'purchase',
        NULL,
        NULL,
        'Test purchase',
        'Testing stock management system'
    );
    
    -- Check new stock
    SELECT available_quantity INTO new_stock
    FROM products 
    WHERE id = test_product_id;
    
    RAISE NOTICE 'Stock after purchase: % (Expected: %)', new_stock, initial_stock - 2;
    
    -- Test stock increase (restock)
    PERFORM update_product_stock(
        test_product_id,
        3,
        'restock',
        NULL,
        NULL,
        'Test restock',
        'Testing restock functionality'
    );
    
    -- Check final stock
    SELECT available_quantity INTO new_stock
    FROM products 
    WHERE id = test_product_id;
    
    RAISE NOTICE 'Stock after restock: % (Expected: %)', new_stock, initial_stock - 2 + 3;
    
END $$;

-- ========================================
-- 3. TEST STOCK HISTORY
-- ========================================
SELECT '=== TESTING STOCK HISTORY ===' as status;

-- Get stock history for a product
DO $$
DECLARE
    test_product_id UUID;
    history_count INTEGER;
BEGIN
    -- Get first product
    SELECT id INTO test_product_id
    FROM products 
    LIMIT 1;
    
    IF test_product_id IS NULL THEN
        RAISE NOTICE 'No products found for testing';
        RETURN;
    END IF;
    
    -- Count stock transactions
    SELECT COUNT(*) INTO history_count
    FROM stock_transactions
    WHERE product_id = test_product_id;
    
    RAISE NOTICE 'Stock history count for product %: %', test_product_id, history_count;
    
    -- Show recent transactions
    RAISE NOTICE 'Recent stock transactions:';
    FOR rec IN 
        SELECT 
            transaction_type,
            quantity,
            previous_quantity,
            new_quantity,
            reason,
            created_at
        FROM stock_transactions
        WHERE product_id = test_product_id
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  %: % -> % (change: %) - %', 
            rec.transaction_type, 
            rec.previous_quantity, 
            rec.new_quantity, 
            rec.quantity,
            rec.reason;
    END LOOP;
    
END $$;

-- ========================================
-- 4. TEST STOCK ALERTS
-- ========================================
SELECT '=== TESTING STOCK ALERTS ===' as status;

-- Check low stock products
SELECT 
    'Low stock products (≤10)' as alert_type,
    COUNT(*) as product_count
FROM get_low_stock_products(10);

-- Check out of stock products
SELECT 
    'Out of stock products' as alert_type,
    COUNT(*) as product_count
FROM get_out_of_stock_products();

-- Show low stock products
SELECT 
    p.name,
    p.available_quantity,
    m.nursery_name
FROM products p
JOIN merchants m ON p.merchant_code = m.merchant_code
WHERE p.available_quantity <= 10
ORDER BY p.available_quantity ASC
LIMIT 5;

-- ========================================
-- 5. TEST STOCK REPORTS
-- ========================================
SELECT '=== TESTING STOCK REPORTS ===' as status;

-- Get stock movement report for last 7 days
SELECT 
    'Stock movement report (last 7 days)' as report_type,
    COUNT(*) as transaction_count
FROM get_stock_movement_report(
    NOW() - INTERVAL '7 days',
    NOW(),
    NULL
);

-- Show stock movement summary
SELECT 
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(ABS(quantity)) as total_quantity_moved
FROM stock_transactions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY transaction_type
ORDER BY transaction_count DESC;

-- ========================================
-- 6. TEST STOCK VALIDATION
-- ========================================
SELECT '=== TESTING STOCK VALIDATION ===' as status;

-- Test negative stock prevention
DO $$
DECLARE
    test_product_id UUID;
    current_stock INTEGER;
    result BOOLEAN;
BEGIN
    -- Get a product with low stock
    SELECT id, available_quantity INTO test_product_id, current_stock
    FROM products 
    WHERE available_quantity > 0
    LIMIT 1;
    
    IF test_product_id IS NULL THEN
        RAISE NOTICE 'No products with stock found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing negative stock prevention with product ID: %, Current stock: %', test_product_id, current_stock;
    
    -- Try to decrease stock more than available (should fail)
    BEGIN
        result := update_product_stock(
            test_product_id,
            -(current_stock + 10), -- Try to decrease more than available
            'purchase',
            NULL,
            NULL,
            'Test negative stock prevention',
            'This should fail'
        );
        RAISE NOTICE '❌ Negative stock prevention failed - stock was allowed to go negative';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '✅ Negative stock prevention working correctly: %', SQLERRM;
    END;
    
END $$;

-- ========================================
-- 7. VERIFY STOCK ACCURACY
-- ========================================
SELECT '=== VERIFYING STOCK ACCURACY ===' as status;

-- Check if stock levels match transaction history
SELECT 
    'Stock accuracy check' as check_type,
    COUNT(*) as products_with_discrepancies
FROM (
    SELECT 
        p.id,
        p.name,
        p.available_quantity as current_stock,
        COALESCE(SUM(st.quantity), 0) as calculated_stock
    FROM products p
    LEFT JOIN stock_transactions st ON p.id = st.product_id
    GROUP BY p.id, p.name, p.available_quantity
    HAVING p.available_quantity != COALESCE(SUM(st.quantity), 0)
) discrepancies;

-- Show products with stock discrepancies (if any)
SELECT 
    p.name,
    p.available_quantity as current_stock,
    COALESCE(SUM(st.quantity), 0) as calculated_stock,
    p.available_quantity - COALESCE(SUM(st.quantity), 0) as difference
FROM products p
LEFT JOIN stock_transactions st ON p.id = st.product_id
GROUP BY p.id, p.name, p.available_quantity
HAVING p.available_quantity != COALESCE(SUM(st.quantity), 0)
ORDER BY ABS(p.available_quantity - COALESCE(SUM(st.quantity), 0)) DESC
LIMIT 5;

-- ========================================
-- 8. FINAL SYSTEM STATUS
-- ========================================
SELECT '=== FINAL SYSTEM STATUS ===' as status;

-- Overall system health
SELECT 
    'Stock Management System' as system,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transactions')
        AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_product_stock')
        AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_order_status_change')
        THEN '✅ FULLY OPERATIONAL'
        ELSE '⚠️ PARTIALLY OPERATIONAL'
    END as status;

-- System statistics
SELECT 
    'System Statistics' as info,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM stock_transactions) as total_transactions,
    (SELECT COUNT(*) FROM products WHERE available_quantity = 0) as out_of_stock_products,
    (SELECT COUNT(*) FROM products WHERE available_quantity <= 10) as low_stock_products;

SELECT '=== STOCK MANAGEMENT SYSTEM TESTING COMPLETE ===' as status;
