-- Fix Duplicate Order-Merchant Issue
-- This script addresses the issue where orders have multiple merchant codes

-- ========================================
-- 1. ANALYZE THE CURRENT ISSUE
-- ========================================

-- Check for orders with multiple merchant codes
SELECT 
    'ORDERS WITH MULTIPLE MERCHANT CODES' as info,
    order_code,
    COUNT(DISTINCT merchant_code) as merchant_count,
    STRING_AGG(DISTINCT merchant_code, ', ') as merchant_codes
FROM orders 
GROUP BY order_code
HAVING COUNT(DISTINCT merchant_code) > 1
ORDER BY order_code;

-- ========================================
-- 2. FIX DUPLICATE ORDERS
-- ========================================

-- Remove duplicate orders, keeping only the most recent one for each order_code
WITH duplicate_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY order_code 
            ORDER BY created_at DESC, updated_at DESC
        ) as rn
    FROM orders 
    WHERE order_code IS NOT NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);

-- ========================================
-- 3. FIX MERCHANT CODE ASSIGNMENT
-- ========================================

-- Update orders to use the correct merchant code from quotation
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND q.merchant_code IS NOT NULL
AND orders.merchant_code != q.merchant_code;

-- ========================================
-- 4. CREATE MISSING ORDER CODES
-- ========================================

-- Generate order codes for orders that don't have them
UPDATE orders 
SET order_code = 'ORD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || 
    LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 6, '0') || '-' || 
    LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 4, '0')
WHERE order_code IS NULL;

-- ========================================
-- 5. VERIFY THE FIX
-- ========================================

-- Check that each order has only one merchant code
SELECT 
    'ORDERS AFTER FIX' as info,
    order_code,
    merchant_code,
    status,
    total_amount,
    created_at
FROM orders 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- Check merchant code distribution
SELECT 
    'MERCHANT CODE DISTRIBUTION' as info,
    merchant_code,
    COUNT(*) as order_count
FROM orders 
GROUP BY merchant_code
ORDER BY merchant_code;