-- Complete Order Status Fix
-- This script fixes all order status issues and ensures orders are properly confirmed

-- Step 1: Check current order status distribution
SELECT 
    'CURRENT STATUS DISTRIBUTION' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 2: Update all pending orders to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending';

-- Step 3: Update any orders with null status to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status IS NULL;

-- Step 4: Update any orders with 'Paid' status to 'confirmed' for consistency
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'Paid';

-- Step 5: Update order_items table if it has status column
UPDATE order_items 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending' OR status IS NULL OR status = 'Paid';

-- Step 6: Verify the updates
SELECT 
    'UPDATED STATUS DISTRIBUTION' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 7: Show sample of updated orders
SELECT 
    'SAMPLE UPDATED ORDERS' as info,
    order_code,
    status,
    total_amount,
    created_at,
    merchant_code,
    CASE 
        WHEN parent_order_id IS NULL THEN 'Parent Order'
        ELSE 'Child Order'
    END as order_type
FROM orders 
ORDER BY created_at DESC 
LIMIT 15;

-- Step 8: Check for any remaining pending orders
SELECT 
    'REMAINING PENDING CHECK' as info,
    COUNT(*) as remaining_pending_orders
FROM orders 
WHERE status = 'pending';

-- Step 9: Show orders by merchant for verification
SELECT 
    'ORDERS BY MERCHANT' as info,
    merchant_code,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code, status
ORDER BY merchant_code, status;