-- Fix All Pending Orders - Update to Confirmed Status
-- This script will update all existing pending orders to confirmed status

-- Step 1: Check current order status distribution
SELECT 
    'BEFORE UPDATE' as status_check,
    status,
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

-- Step 4: Update order_items table if it has status column
UPDATE order_items 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending' OR status IS NULL;

-- Step 5: Verify the updates
SELECT 
    'AFTER UPDATE' as status_check,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 6: Show updated orders for verification
SELECT 
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
LIMIT 10;

-- Step 7: Check if there are any orders still pending
SELECT 
    COUNT(*) as remaining_pending_orders
FROM orders 
WHERE status = 'pending';