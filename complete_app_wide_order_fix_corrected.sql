-- Complete App-Wide Order Fix - CORRECTED VERSION
-- This script fixes the entire application to ensure all orders are automatically confirmed

-- Step 1: Check current order status distribution across all merchants
SELECT 
    'BEFORE UPDATE - All Orders Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 2: Update ALL pending orders to confirmed (entire app)
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending';

-- Step 3: Update ALL null status orders to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status IS NULL;

-- Step 4: Update ALL Paid status orders to confirmed for consistency
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'Paid';

-- Step 5: Update any other status variations to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled');

-- Step 6: Verify all orders now have valid statuses
SELECT 
    'AFTER STATUS UPDATE - All Orders Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 7: Update the default status for ALL new orders (app-wide)
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- Step 8: Remove existing constraint if it exists and add new one
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- Step 9: Create a comprehensive view for ALL merchant orders
CREATE OR REPLACE VIEW all_merchant_orders AS
SELECT 
    o.id,
    o.order_code,
    o.status,
    o.total_amount,
    o.subtotal,
    o.created_at,
    o.merchant_code,
    o.merchant_id,
    o.cart_items,
    o.delivery_address,
    o.parent_order_id,
    o.user_id,
    -- Customer information
    COALESCE(up.first_name || ' ' || up.last_name, 'Customer') as customer_name,
    COALESCE(up.email, 'No email') as customer_email,
    COALESCE(up.phone, 'No phone') as customer_phone,
    -- Item count
    CASE 
        WHEN o.cart_items IS NOT NULL AND jsonb_typeof(o.cart_items) = 'array' 
        THEN jsonb_array_length(o.cart_items)
        ELSE 0
    END as item_count,
    -- Delivery address
    CASE 
        WHEN o.delivery_address IS NOT NULL AND jsonb_typeof(o.delivery_address) = 'object'
        THEN COALESCE(
            (o.delivery_address->>'addressLine') || ', ' ||
            (o.delivery_address->>'city') || ', ' ||
            (o.delivery_address->>'state') || ' - ' ||
            (o.delivery_address->>'pincode'),
            'Address available'
        )
        ELSE 'No address'
    END as delivery_location,
    -- Parent order info if exists
    po.order_code as parent_order_code,
    po.delivery_address as parent_delivery_address
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
LEFT JOIN orders po ON o.parent_order_id = po.id
WHERE o.merchant_code IS NOT NULL;

-- Step 10: Update merchant_id for all orders to ensure proper linking
UPDATE orders 
SET merchant_id = m.id
FROM merchants m
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- Step 11: Verify the updates for ALL merchants
SELECT 
    'FINAL VERIFICATION - All Orders Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Step 12: Show orders by merchant for verification
SELECT 
    'ORDERS BY MERCHANT' as info,
    merchant_code,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code, status
ORDER BY merchant_code, status;

-- Step 13: Show sample orders for all merchants
SELECT 
    'SAMPLE ORDERS - ALL MERCHANTS' as info,
    order_code,
    merchant_code,
    status,
    total_amount,
    customer_name,
    customer_email,
    item_count,
    delivery_location
FROM all_merchant_orders
ORDER BY created_at DESC
LIMIT 20;

-- Step 14: Final verification - ensure no invalid statuses remain
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
    'Shipped Orders' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'shipped'
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Delivered Orders' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'delivered'
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Cancelled Orders' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'cancelled'
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Orders with Merchant Code' as metric,
    COUNT(*) as value
FROM orders 
WHERE merchant_code IS NOT NULL
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Invalid Status Orders (should be 0)' as metric,
    COUNT(*) as value
FROM orders 
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled');

-- Step 15: Test constraint by trying to insert an invalid status (should fail)
-- This is just a test - it will fail as expected
-- INSERT INTO orders (status) VALUES ('invalid_status');

-- Step 16: Success message
SELECT 
    'SUCCESS' as status,
    'All orders updated to confirmed status' as message,
    'Constraint added successfully' as constraint_status,
    'Application ready for auto-confirmation' as app_status;