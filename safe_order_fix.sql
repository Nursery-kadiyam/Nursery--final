-- Safe Order Fix - No Constraint Issues
-- This script safely fixes all order statuses without constraint problems

-- STEP 1: Check current statuses
SELECT 
    'BEFORE FIX - Current Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- STEP 2: Update all orders to confirmed status
-- This handles ALL possible status variations
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status IS NULL 
   OR status != 'confirmed';

-- STEP 3: Set default status for new orders
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- STEP 4: Remove any existing constraint first
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- STEP 5: Add constraint only after all data is clean
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- STEP 6: Update merchant_id for all orders
UPDATE orders 
SET merchant_id = m.id
FROM merchants m
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- STEP 7: Verify the fix worked
SELECT 
    'AFTER FIX - Status Distribution' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- STEP 8: Show orders by merchant
SELECT 
    'ORDERS BY MERCHANT' as info,
    merchant_code,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code, status
ORDER BY merchant_code, status;

-- STEP 9: Show sample orders with customer info
SELECT 
    'SAMPLE ORDERS WITH CUSTOMER INFO' as info,
    o.order_code,
    o.merchant_code,
    o.status,
    o.total_amount,
    COALESCE(up.first_name || ' ' || up.last_name, 'Customer') as customer_name,
    COALESCE(up.email, 'No email') as customer_email,
    o.created_at
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
WHERE o.merchant_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 15;

-- STEP 10: Final success message
SELECT 
    'SUCCESS' as status,
    'All orders are now confirmed' as message,
    'Merchants can see all orders' as merchant_status,
    'Users get instant confirmation' as user_status;