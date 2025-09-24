-- Complete App-Wide Order Fix
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

-- Step 5: Update the default status for ALL new orders (app-wide)
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- Step 6: Add constraint to ensure only valid statuses are allowed
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- Step 7: Create a comprehensive view for ALL merchant orders
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

-- Step 8: Update merchant_id for all orders to ensure proper linking
UPDATE orders 
SET merchant_id = m.id
FROM merchants m
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- Step 9: Verify the updates for ALL merchants
SELECT 
    'AFTER UPDATE - All Orders Status Distribution' as info,
    COALESCE(status, 'NULL') as status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

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

-- Step 11: Show sample orders for all merchants
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

-- Step 12: Final verification - ensure no pending orders remain
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
    'Pending Orders (should be 0)' as metric,
    COUNT(*) as value
FROM orders 
WHERE status = 'pending'
UNION ALL
SELECT 
    'FINAL VERIFICATION' as info,
    'Orders with Merchant Code' as metric,
    COUNT(*) as value
FROM orders 
WHERE merchant_code IS NOT NULL;