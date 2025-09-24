-- Complete Orders Database Fix
-- This script fixes all order-related issues in the database

-- Step 1: Check current order status distribution
SELECT 
    'BEFORE UPDATE - Order Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 2: Update all existing pending orders to confirmed
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

-- Step 5: Update the default status constraint for orders table
-- First, drop the existing default
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- Then set the new default to 'confirmed'
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- Step 6: Add a check constraint to only allow valid statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- Step 7: Verify the updates
SELECT 
    'AFTER UPDATE - Order Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 8: Show sample of updated orders
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

-- Step 9: Check for any remaining pending orders
SELECT 
    'REMAINING PENDING CHECK' as info,
    COUNT(*) as remaining_pending_orders
FROM orders 
WHERE status = 'pending';

-- Step 10: Show orders by merchant for verification
SELECT 
    'ORDERS BY MERCHANT' as info,
    merchant_code,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code, status
ORDER BY merchant_code, status;

-- Step 11: Update any order_items that might have status issues
UPDATE order_items 
SET 
    updated_at = NOW()
WHERE updated_at IS NULL;

-- Step 12: Show final verification
SELECT 
    'FINAL VERIFICATION' as info,
    'Total Orders' as metric,
    COUNT(*) as value
FROM orders
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Confirmed Orders' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'confirmed'
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Pending Orders' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'pending';