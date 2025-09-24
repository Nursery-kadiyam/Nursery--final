-- Fix Merchant Order Product Display - Corrected Version
-- This script drops existing functions and creates new ones with proper return types

-- ========================================
-- 1. DROP EXISTING FUNCTIONS
-- ========================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);
DROP FUNCTION IF EXISTS get_merchant_orders_simple(text);

-- ========================================
-- 2. CREATE MERCHANT ORDERS FUNCTION WITH PRODUCTS
-- ========================================

-- Create the function to get merchant orders with product details
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

-- ========================================
-- 3. CREATE SIMPLER MERCHANT ORDERS FUNCTION
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

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_simple TO authenticated;

-- ========================================
-- 5. VERIFY FUNCTIONS CREATED
-- ========================================

-- Check if functions were created successfully
SELECT 
    'FUNCTIONS CREATED' as info,
    proname as function_name,
    proargnames as parameters,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('get_merchant_orders_with_products', 'get_merchant_orders_simple')
ORDER BY proname;

-- ========================================
-- 6. TEST THE FUNCTIONS
-- ========================================

-- Test the simple function first
SELECT 
    'TEST SIMPLE FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(cart_items) as item_count
FROM get_merchant_orders_simple('MC-2025-TXYR')
LIMIT 3;

-- Test the detailed function
SELECT 
    'TEST DETAILED FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;