-- Verify and Fix Remaining Pending Orders
-- This script checks for any remaining pending orders and fixes them

-- ========================================
-- 1. CHECK CURRENT STATUS DISTRIBUTION
-- ========================================

-- Check what status values currently exist
SELECT 
    'CURRENT STATUS DISTRIBUTION' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- ========================================
-- 2. FIND ANY REMAINING PENDING ORDERS
-- ========================================

-- Check for any orders that still have pending status
SELECT 
    'REMAINING PENDING ORDERS' as info,
    id,
    order_code,
    status,
    created_at,
    updated_at
FROM orders 
WHERE status IN ('pending', 'pending_payment', 'processing', 'in_progress', 'active')
ORDER BY created_at DESC;

-- ========================================
-- 3. FORCE UPDATE ALL PENDING ORDERS
-- ========================================

-- Update any remaining pending orders to confirmed
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status IN ('pending', 'pending_payment', 'processing', 'in_progress', 'active', 'waiting', 'awaiting');

-- Update any NULL statuses
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status IS NULL;

-- ========================================
-- 4. CHECK CONSTRAINT STATUS
-- ========================================

-- Verify the constraint exists and is working
SELECT 
    'CONSTRAINT STATUS' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_status_check';

-- ========================================
-- 5. VERIFY ALL ORDERS ARE NOW CONFIRMED
-- ========================================

-- Final check - all orders should now be confirmed or other valid statuses
SELECT 
    'FINAL STATUS CHECK' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Check for any invalid statuses
SELECT 
    'INVALID STATUS CHECK' as info,
    status,
    COUNT(*) as count
FROM orders 
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled')
GROUP BY status;

-- ========================================
-- 6. SHOW SPECIFIC ORDER DETAILS
-- ========================================

-- Show details of the specific order that's showing as pending in UI
SELECT 
    'ORDER DETAILS' as info,
    id,
    order_code,
    status,
    total_amount,
    created_at,
    updated_at,
    user_id,
    quotation_code
FROM orders 
WHERE order_code = 'ORD-2025-0007' OR id::text LIKE '%0007%'
ORDER BY created_at DESC;

-- ========================================
-- 7. FORCE UPDATE SPECIFIC ORDER
-- ========================================

-- Force update the specific order that's showing as pending
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE order_code = 'ORD-2025-0007' OR id::text LIKE '%0007%';

-- ========================================
-- 8. VERIFY THE FIX
-- ========================================

-- Check that the specific order is now confirmed
SELECT 
    'SPECIFIC ORDER STATUS' as info,
    order_code,
    status,
    updated_at
FROM orders 
WHERE order_code = 'ORD-2025-0007' OR id::text LIKE '%0007%';