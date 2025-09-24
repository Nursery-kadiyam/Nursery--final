-- Fix Merchant Order Display
-- This script ensures orders are properly linked to merchants and display correctly

-- ========================================
-- 1. CHECK CURRENT ORDER-MERCHANT LINKING
-- ========================================

-- Check how orders are currently linked to merchants
SELECT 
    'CURRENT ORDER-MERCHANT LINKING' as info,
    o.order_code,
    o.merchant_code,
    o.quotation_code,
    q.merchant_code as quotation_merchant_code,
    o.status,
    o.created_at
FROM orders o
LEFT JOIN quotations q ON q.quotation_code = o.quotation_code
WHERE o.created_at >= NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 2. FIX ORDERS WITH WRONG MERCHANT CODES
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
-- 3. CREATE MISSING ORDER CODES
-- ========================================

-- Generate order codes for orders that don't have them
UPDATE orders 
SET order_code = 'ORD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 6, '0') || '-' || LPAD((id::text)[-4:], 4, '0')
WHERE order_code IS NULL;

-- ========================================
-- 4. VERIFY MERCHANT ORDER LINKING
-- ========================================

-- Check orders by merchant code
SELECT 
    'ORDERS BY MERCHANT CODE' as info,
    merchant_code,
    COUNT(*) as order_count,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count
FROM orders 
GROUP BY merchant_code
ORDER BY merchant_code;

-- ========================================
-- 5. CHECK RECENT ORDERS FOR EACH MERCHANT
-- ========================================

-- Show recent orders for each merchant
SELECT 
    'RECENT ORDERS BY MERCHANT' as info,
    merchant_code,
    order_code,
    status,
    total_amount,
    created_at
FROM orders 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY merchant_code, created_at DESC;

-- ========================================
-- 6. CREATE INDEXES FOR BETTER PERFORMANCE
-- ========================================

-- Create indexes to improve order fetching performance
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code_status ON orders(merchant_code, status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code_created_at ON orders(merchant_code, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_code ON orders(quotation_code);

-- ========================================
-- 7. VERIFY THE FIX
-- ========================================

-- Final verification - check that orders are properly linked
SELECT 
    'FINAL VERIFICATION' as info,
    'Orders with proper merchant codes' as status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code != 'admin' OR merchant_code IS NULL;

-- Check for any remaining issues
SELECT 
    'REMAINING ISSUES' as info,
    'Orders still with admin merchant code' as status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code = 'admin' 
AND quotation_code IS NOT NULL
AND EXISTS (
    SELECT 1 FROM quotations q 
    WHERE q.quotation_code = orders.quotation_code 
    AND q.merchant_code IS NOT NULL
);