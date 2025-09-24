-- Fix Merchant Order Product Display
-- This script creates the necessary functions and fixes to display product names and images in merchant dashboard

-- ========================================
-- 1. CREATE MERCHANT ORDERS FUNCTION WITH PRODUCTS
-- ========================================

-- Create or replace the function to get merchant orders with product details
CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    merchant_code TEXT,
    buyer_reference TEXT,
    order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.total_amount,
        o.created_at,
        o.status,
        o.merchant_code,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', COALESCE(p.name, 'Unknown Product'),
                        'product_image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.price * oi.quantity,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 2. CREATE SIMPLER MERCHANT ORDERS FUNCTION
-- ========================================

-- Create a simpler function that just gets orders with basic product info
CREATE OR REPLACE FUNCTION get_merchant_orders_simple(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    merchant_code TEXT,
    buyer_reference TEXT,
    cart_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.total_amount,
        o.created_at,
        o.status,
        o.merchant_code,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(o.cart_items, '[]'::jsonb) as cart_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_simple TO authenticated;

-- ========================================
-- 3. VERIFY ORDER_ITEMS TABLE STRUCTURE
-- ========================================

-- Check if order_items table has the necessary columns
SELECT 
    'ORDER_ITEMS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- ========================================
-- 4. CHECK PRODUCTS TABLE STRUCTURE
-- ========================================

-- Check if products table has the necessary columns
SELECT 
    'PRODUCTS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- ========================================
-- 5. VERIFY ORDER-PRODUCT LINKING
-- ========================================

-- Check how orders are linked to products
SELECT 
    'ORDER-PRODUCT LINKING' as info,
    o.order_code,
    o.merchant_code,
    oi.product_id,
    p.name as product_name,
    p.image_url as product_image,
    oi.quantity,
    oi.price
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.merchant_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 6. TEST THE FUNCTIONS
-- ========================================

-- Test the merchant orders function
SELECT 
    'TEST MERCHANT ORDERS FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 5;