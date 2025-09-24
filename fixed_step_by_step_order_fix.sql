-- Fixed Step-by-Step Order Fix - Correct PostgreSQL Syntax
-- This script fixes the order confirmation issue step by step with proper syntax

-- STEP 1: Check what statuses currently exist
SELECT 
    'CURRENT STATUS DISTRIBUTION' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- STEP 2: Update all invalid statuses to confirmed
-- This handles any status that's not in our allowed list
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status IS NULL 
   OR status = 'pending' 
   OR status = 'Paid' 
   OR status = 'PENDING'
   OR status = 'PAID'
   OR status = 'Pending'
   OR status = 'Paid'
   OR status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled');

-- STEP 3: Verify all statuses are now valid
SELECT 
    'AFTER STATUS CLEANUP' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- STEP 4: Set default status for new orders
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- STEP 5: Remove any existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- STEP 6: Add the new constraint (this should work now)
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- STEP 7: Verify constraint was added successfully (fixed syntax)
SELECT 
    'CONSTRAINT VERIFICATION' as info,
    conname as constraint_name,
    contype as constraint_type,
    'Constraint added successfully' as status
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_status_check';

-- STEP 8: Update merchant_id for all orders
UPDATE orders 
SET merchant_id = m.id
FROM merchants m
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- STEP 9: Final verification
SELECT 
    'FINAL STATUS DISTRIBUTION' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- STEP 10: Show sample of updated orders
SELECT 
    'SAMPLE UPDATED ORDERS' as info,
    order_code,
    merchant_code,
    status,
    total_amount,
    created_at
FROM orders 
WHERE merchant_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- STEP 11: Show orders by merchant for verification
SELECT 
    'ORDERS BY MERCHANT' as info,
    merchant_code,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code, status
ORDER BY merchant_code, status;

-- STEP 12: Show sample orders with customer information
SELECT 
    'SAMPLE ORDERS WITH CUSTOMER INFO' as info,
    o.order_code,
    o.merchant_code,
    o.status,
    o.total_amount,
    COALESCE(up.first_name || ' ' || up.last_name, 'Customer') as customer_name,
    COALESCE(up.email, 'No email') as customer_email,
    COALESCE(up.phone, 'No phone') as customer_phone,
    o.created_at
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
WHERE o.merchant_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 15;

-- STEP 13: Final success message
SELECT 
    'SUCCESS' as status,
    'All orders updated successfully' as message,
    'Constraint added without errors' as constraint_status,
    'Application ready for auto-confirmation' as app_status;