-- Quick Fix for Merchant Order Linking
-- This script fixes the immediate issue with order-merchant linking

-- ========================================
-- 1. FIX ORDERS WITH WRONG MERCHANT CODES
-- ========================================

-- Update orders that have 'admin' as merchant_code but should have actual merchant codes
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND orders.merchant_code = 'admin'
AND q.merchant_code IS NOT NULL;

-- ========================================
-- 2. CREATE MISSING ORDER CODES (SIMPLE VERSION)
-- ========================================

-- Generate simple order codes for orders that don't have them
UPDATE orders 
SET order_code = 'ORD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || 
    LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 6, '0') || '-' || 
    LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 4, '0')
WHERE order_code IS NULL;

-- ========================================
-- 3. VERIFY THE FIX
-- ========================================

-- Check orders by merchant code
SELECT 
    'ORDERS BY MERCHANT CODE' as info,
    merchant_code,
    COUNT(*) as order_count
FROM orders 
GROUP BY merchant_code
ORDER BY merchant_code;

-- Check recent orders
SELECT 
    'RECENT ORDERS' as info,
    order_code,
    merchant_code,
    status,
    total_amount,
    created_at
FROM orders 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;