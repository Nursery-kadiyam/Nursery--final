-- Debug and Fix Orders for Merchant Dashboard
-- Run this in your Supabase SQL Editor

-- Step 1: Check current orders table structure
SELECT '=== CHECKING ORDERS TABLE STRUCTURE ===' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 2: Check current orders data
SELECT '=== CHECKING CURRENT ORDERS DATA ===' as status;

SELECT 
    id,
    order_code,
    user_id,
    merchant_code,
    total_amount,
    status,
    cart_items,
    created_at
FROM orders 
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check if orders have merchant_code
SELECT '=== CHECKING MERCHANT_CODE ASSIGNMENT ===' as status;

SELECT 
    merchant_code,
    COUNT(*) as order_count
FROM orders 
GROUP BY merchant_code
ORDER BY order_count DESC;

-- Step 4: Check for orders without merchant_code
SELECT '=== ORDERS WITHOUT MERCHANT_CODE ===' as status;

SELECT 
    id,
    order_code,
    user_id,
    cart_items,
    created_at
FROM orders 
WHERE merchant_code IS NULL
ORDER BY created_at DESC;

-- Step 5: Fix orders without merchant_code
SELECT '=== FIXING ORDERS WITHOUT MERCHANT_CODE ===' as status;

-- Update orders without merchant_code based on cart_items
UPDATE orders 
SET merchant_code = (
    SELECT (cart_items->0->>'selected_merchant')::TEXT
    FROM orders o2 
    WHERE o2.id = orders.id 
    AND o2.cart_items IS NOT NULL 
    AND jsonb_array_length(o2.cart_items) > 0
    AND (cart_items->0->>'selected_merchant') IS NOT NULL
)
WHERE merchant_code IS NULL 
AND cart_items IS NOT NULL 
AND jsonb_array_length(cart_items) > 0
AND (cart_items->0->>'selected_merchant') IS NOT NULL;

-- For remaining orders without merchant_code, set to 'admin' as default
UPDATE orders 
SET merchant_code = 'admin'
WHERE merchant_code IS NULL;

-- Step 6: Add order_code if missing
SELECT '=== ADDING ORDER_CODE IF MISSING ===' as status;

UPDATE orders 
SET order_code = 'ORD-' || EXTRACT(EPOCH FROM created_at)::BIGINT
WHERE order_code IS NULL;

-- Step 7: Check user_profiles table
SELECT '=== CHECKING USER_PROFILES TABLE ===' as status;

SELECT 
    id,
    first_name,
    last_name,
    email,
    role
FROM user_profiles 
LIMIT 5;

-- Step 8: Check merchants table
SELECT '=== CHECKING MERCHANTS TABLE ===' as status;

SELECT 
    merchant_code,
    full_name,
    nursery_name,
    status
FROM merchants 
LIMIT 5;

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as status;

SELECT 
    'Orders by Merchant' as info,
    merchant_code,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
FROM orders 
GROUP BY merchant_code
ORDER BY total_orders DESC;

-- Step 10: Sample order with full details
SELECT '=== SAMPLE ORDER WITH FULL DETAILS ===' as status;

SELECT 
    o.id,
    o.order_code,
    o.user_id,
    o.merchant_code,
    o.total_amount,
    o.status,
    o.cart_items,
    o.created_at,
    up.first_name,
    up.last_name,
    up.email
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
ORDER BY o.created_at DESC
LIMIT 3;
