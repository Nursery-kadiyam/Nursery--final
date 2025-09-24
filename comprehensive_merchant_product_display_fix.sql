-- COMPREHENSIVE MERCHANT ORDER PRODUCT DISPLAY FIX
-- This script fixes the issue where merchant orders show "Unknown Product" instead of actual plant names and images

-- ========================================
-- 1. DROP EXISTING FUNCTIONS
-- ========================================

DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);
DROP FUNCTION IF EXISTS get_merchant_order_details(uuid, text);

-- ========================================
-- 2. CREATE ENHANCED MERCHANT ORDERS FUNCTION
-- ========================================

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
                        'product_name', COALESCE(
                            p.name,
                            qi.product_name,
                            oi.product_name,
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            p.image_url,
                            qi.product_image,
                            oi.product_image,
                            '/assets/placeholder.svg'
                        ),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.price * oi.quantity,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code,
                        'variety', COALESCE(qi.variety, oi.variety),
                        'plant_type', COALESCE(qi.plant_type, oi.plant_type),
                        'age_category', COALESCE(qi.age_category, oi.age_category),
                        'bag_size', COALESCE(qi.bag_size, oi.bag_size),
                        'height_range', COALESCE(qi.height_range, oi.height_range),
                        'stem_thickness', COALESCE(qi.stem_thickness, oi.stem_thickness),
                        'weight', COALESCE(qi.weight, oi.weight),
                        'is_grafted', COALESCE(qi.is_grafted, oi.is_grafted),
                        'delivery_timeline', COALESCE(qi.delivery_timeline, oi.delivery_timeline),
                        'has_modified_specs', COALESCE(qi.has_modified_specs, oi.has_modified_specs, false),
                        'quotation_code', qi.quotation_code
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                LEFT JOIN quotation_items qi ON qi.id = oi.quotation_item_id
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
-- 3. CREATE ENHANCED ORDER DETAILS FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
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
                        'product_name', COALESCE(
                            p.name,
                            qi.product_name,
                            oi.product_name,
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            p.image_url,
                            qi.product_image,
                            oi.product_image,
                            '/assets/placeholder.svg'
                        ),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.price * oi.quantity,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code,
                        'variety', COALESCE(qi.variety, oi.variety),
                        'plant_type', COALESCE(qi.plant_type, oi.plant_type),
                        'age_category', COALESCE(qi.age_category, oi.age_category),
                        'bag_size', COALESCE(qi.bag_size, oi.bag_size),
                        'height_range', COALESCE(qi.height_range, oi.height_range),
                        'stem_thickness', COALESCE(qi.stem_thickness, oi.stem_thickness),
                        'weight', COALESCE(qi.weight, oi.weight),
                        'is_grafted', COALESCE(qi.is_grafted, oi.is_grafted),
                        'delivery_timeline', COALESCE(qi.delivery_timeline, oi.delivery_timeline),
                        'has_modified_specs', COALESCE(qi.has_modified_specs, oi.has_modified_specs, false),
                        'quotation_code', qi.quotation_code
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                LEFT JOIN quotation_items qi ON qi.id = oi.quotation_item_id
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    WHERE o.id = p_order_id 
    AND o.merchant_code = p_merchant_code;
END;
$$;

-- ========================================
-- 4. CREATE FALLBACK FUNCTION FOR CART ITEMS
-- ========================================

CREATE OR REPLACE FUNCTION get_merchant_orders_with_cart_items(p_merchant_code TEXT)
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
        COALESCE(o.cart_items, '[]'::jsonb) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_cart_items TO authenticated;

-- ========================================
-- 6. VERIFY FUNCTIONS CREATED
-- ========================================

SELECT 
    'FUNCTIONS CREATED' as info,
    proname as function_name,
    proargnames as parameters,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('get_merchant_orders_with_products', 'get_merchant_order_details', 'get_merchant_orders_with_cart_items')
ORDER BY proname;

-- ========================================
-- 7. TEST THE FUNCTIONS
-- ========================================

-- Test the enhanced function
SELECT 
    'TEST ENHANCED FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;

-- Test order details function
SELECT 
    'TEST ORDER DETAILS' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_order_details(
    (SELECT id FROM orders WHERE merchant_code = 'MC-2025-TXYR' LIMIT 1),
    'MC-2025-TXYR'
);

-- Test fallback function
SELECT 
    'TEST FALLBACK FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_cart_items('MC-2025-TXYR')
LIMIT 3;