-- TEST MULTI-MERCHANT ORDER SYSTEM
-- Run this after executing the main fix_orders_merchant_code.sql script
-- This will test the complete order flow

-- ========================================
-- 1. TEST DATA SETUP
-- ========================================

-- Insert test user profile if it doesn't exist
INSERT INTO user_profiles (user_id, first_name, last_name, email, phone, role, merchant_code)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Test',
    'User',
    'test@example.com',
    '1234567890',
    'user',
    NULL
) ON CONFLICT (user_id) DO NOTHING;

-- Insert test merchant profiles if they don't exist
INSERT INTO user_profiles (user_id, first_name, last_name, email, phone, role, merchant_code)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'Merchant', 'One', 'merchant1@example.com', '1111111111', 'merchant', 'MC001'),
    ('00000000-0000-0000-0000-000000000003', 'Merchant', 'Two', 'merchant2@example.com', '2222222222', 'merchant', 'MC002'),
    ('00000000-0000-0000-0000-000000000004', 'Admin', 'User', 'admin@example.com', '9999999999', 'admin', NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Insert test quotation if it doesn't exist
INSERT INTO quotations (
    id,
    quotation_code,
    user_id,
    items,
    status,
    is_user_request,
    created_at
) VALUES (
    'QT-TEST-001',
    'QT-2024-001',
    '00000000-0000-0000-0000-000000000001',
    '[{"product_id": "00000000-0000-0000-0000-000000000001", "name": "Test Plant 1", "quantity": 2, "unit_price": 100}, {"product_id": "00000000-0000-0000-0000-000000000002", "name": "Test Plant 2", "quantity": 1, "unit_price": 150}]',
    'pending',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. TEST ORDER CREATION FUNCTION
-- ========================================

-- Test creating orders from quotations
SELECT '=== TESTING ORDER CREATION ===' as test_section;

-- Simulate user selecting merchants for different items
SELECT create_order_from_quotations(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'QT-2024-001',
    '[
        {
            "merchant_code": "MC001",
            "items": [{"product_id": "00000000-0000-0000-0000-000000000001", "name": "Test Plant 1", "quantity": 2, "unit_price": 100, "total_price": 200}],
            "total_price": 200
        },
        {
            "merchant_code": "MC002", 
            "items": [{"product_id": "00000000-0000-0000-0000-000000000002", "name": "Test Plant 2", "quantity": 1, "unit_price": 150, "total_price": 150}],
            "total_price": 150
        }
    ]'::JSONB,
    '{"address": "123 Test St", "city": "Test City", "pincode": "123456"}'::JSONB,
    '123 Test St, Test City - 123456'
);

-- ========================================
-- 3. TEST MERCHANT ORDERS FUNCTION
-- ========================================

SELECT '=== TESTING MERCHANT ORDERS ===' as test_section;

-- Test getting orders for Merchant 1
SELECT 'Merchant MC001 Orders:' as merchant_info;
SELECT * FROM get_merchant_orders('MC001');

-- Test getting orders for Merchant 2  
SELECT 'Merchant MC002 Orders:' as merchant_info;
SELECT * FROM get_merchant_orders('MC002');

-- ========================================
-- 4. TEST ADMIN ORDERS FUNCTION
-- ========================================

SELECT '=== TESTING ADMIN ORDERS ===' as test_section;

-- Test getting all orders for admin
SELECT 'All Orders (Admin View):' as admin_info;
SELECT * FROM get_all_orders_admin();

-- ========================================
-- 5. TEST STATUS UPDATE FUNCTION
-- ========================================

SELECT '=== TESTING STATUS UPDATES ===' as test_section;

-- Get the first order ID for testing
DO $$
DECLARE
    v_order_id UUID;
BEGIN
    SELECT id INTO v_order_id FROM orders WHERE merchant_code = 'MC001' LIMIT 1;
    
    IF v_order_id IS NOT NULL THEN
        -- Test updating delivery status
        PERFORM update_order_delivery_status(v_order_id, 'MC001', 'processing');
        RAISE NOTICE 'Updated order % to processing status', v_order_id;
        
        -- Test updating to shipped
        PERFORM update_order_delivery_status(v_order_id, 'MC001', 'shipped');
        RAISE NOTICE 'Updated order % to shipped status', v_order_id;
    ELSE
        RAISE NOTICE 'No orders found for testing status updates';
    END IF;
END $$;

-- ========================================
-- 6. VERIFY RESULTS
-- ========================================

SELECT '=== VERIFICATION RESULTS ===' as verification_section;

-- Check orders table
SELECT 
    'Orders Table Status' as table_name,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as merchant_orders,
    COUNT(CASE WHEN merchant_code IS NULL THEN 1 END) as main_orders
FROM orders;

-- Check order items
SELECT 
    'Order Items Table Status' as table_name,
    COUNT(*) as total_items,
    COUNT(DISTINCT order_id) as unique_orders,
    COUNT(DISTINCT merchant_code) as unique_merchants
FROM order_items;

-- Check merchant distribution
SELECT 
    'Merchant Order Distribution' as distribution_info,
    merchant_code,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code
ORDER BY merchant_code;

-- Check status distribution
SELECT 
    'Order Status Distribution' as status_info,
    delivery_status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY delivery_status
ORDER BY delivery_status;

-- ========================================
-- 7. CLEANUP (OPTIONAL)
-- ========================================

-- Uncomment the following lines if you want to clean up test data
/*
DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE quotation_code = 'QT-2024-001'
);
DELETE FROM orders WHERE quotation_code = 'QT-2024-001';
DELETE FROM quotations WHERE quotation_code = 'QT-2024-001';
*/

SELECT '=== TEST COMPLETED ===' as final_status;
