-- Simple Merchant Orders Fix V2
-- This script provides a simple solution for the merchant dashboard orders

-- Step 1: Update all pending orders to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'pending';

-- Step 2: Update null status orders to confirmed
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status IS NULL;

-- Step 3: Update Paid status to confirmed for consistency
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE status = 'Paid';

-- Step 4: Update the default status for new orders
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed';

-- Step 5: Create a simple query for merchant dashboard
-- This query will show orders with proper customer information
SELECT 
    o.id,
    o.order_code,
    o.status,
    o.total_amount,
    o.created_at,
    o.merchant_code,
    o.cart_items,
    o.delivery_address,
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
    END as delivery_location
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
WHERE o.merchant_code = 'MC-2025-0005'  -- Replace with actual merchant code
ORDER BY o.created_at DESC;

-- Step 6: Show verification
SELECT 
    'VERIFICATION' as info,
    status,
    COUNT(*) as count
FROM orders 
WHERE merchant_code = 'MC-2025-0005'
GROUP BY status
ORDER BY status;