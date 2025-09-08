-- COMPLETE MERCHANT ORDER SYSTEM IMPLEMENTATION
-- This script ensures all orders are properly assigned to merchants
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

-- Step 2: Add merchant_code column if it doesn't exist
SELECT '=== ADDING MERCHANT_CODE COLUMN ===' as status;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS merchant_code TEXT;

-- Step 3: Check for orders without merchant_code
SELECT '=== CHECKING ORDERS WITHOUT MERCHANT_CODE ===' as status;

SELECT 
    COUNT(*) as orders_without_merchant_code,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as orders_with_merchant_code
FROM orders;

-- Step 4: Update orders without merchant_code based on cart_items
SELECT '=== UPDATING ORDERS WITHOUT MERCHANT_CODE ===' as status;

-- For orders with cart_items, extract merchant_code from the first item
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

-- Step 5: Make merchant_code NOT NULL
SELECT '=== MAKING MERCHANT_CODE NOT NULL ===' as status;

ALTER TABLE orders 
ALTER COLUMN merchant_code SET NOT NULL;

-- Step 6: Create index for better performance
SELECT '=== CREATING INDEXES ===' as status;

CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Step 7: Verify the updates
SELECT '=== VERIFICATION ===' as status;

SELECT 
    merchant_code,
    COUNT(*) as order_count,
    MIN(created_at) as earliest_order,
    MAX(created_at) as latest_order
FROM orders 
GROUP BY merchant_code
ORDER BY order_count DESC;

-- Step 8: Check products table merchant_code
SELECT '=== CHECKING PRODUCTS MERCHANT_CODE ===' as status;

SELECT 
    merchant_code,
    COUNT(*) as product_count
FROM products 
GROUP BY merchant_code
ORDER BY product_count DESC;

-- Step 9: Create RLS policies for merchant order access
SELECT '=== CREATING RLS POLICIES ===' as status;

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Create new policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view their orders" ON orders
    FOR SELECT USING (
        merchant_code = (
            SELECT merchant_code FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'merchant'
        )
    );

CREATE POLICY "Admins can view all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Step 10: Final verification
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
