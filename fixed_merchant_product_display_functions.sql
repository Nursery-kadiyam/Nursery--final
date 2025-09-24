-- FIXED MERCHANT ORDER PRODUCT DISPLAY FUNCTIONS
-- This script works with the actual database schema provided

-- ========================================
-- 1. DROP EXISTING FUNCTIONS
-- ========================================

DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);
DROP FUNCTION IF EXISTS get_merchant_order_details(uuid, text);
DROP FUNCTION IF EXISTS get_merchant_orders_with_cart_items(text);

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
                            oi.quotation_product_name,
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            p.image_url,
                            oi.quotation_product_image,
                            '/assets/placeholder.svg'
                        ),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.subtotal,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code,
                        'quotation_specifications', oi.quotation_specifications
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
                            oi.quotation_product_name,
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            p.image_url,
                            oi.quotation_product_image,
                            '/assets/placeholder.svg'
                        ),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.subtotal,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code,
                        'quotation_specifications', oi.quotation_specifications
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
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
-- 5. CREATE FUNCTION TO GET QUOTATION DATA
-- ========================================

CREATE OR REPLACE FUNCTION get_merchant_orders_with_quotation_data(p_merchant_code TEXT)
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
                            oi.quotation_product_name,
                            q_item->>'name',
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            p.image_url,
                            oi.quotation_product_image,
                            q_item->>'image',
                            '/assets/placeholder.svg'
                        ),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.subtotal,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code,
                        'quotation_specifications', oi.quotation_specifications,
                        'quotation_item_data', q_item
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                LEFT JOIN quotations q ON q.quotation_code = oi.quotation_id
                LEFT JOIN LATERAL jsonb_array_elements(q.items) AS q_item ON true
                WHERE oi.order_id = o.id
                AND (q_item->>'index')::int = oi.quotation_item_index
            ),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- ========================================
-- 6. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_cart_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_quotation_data TO authenticated;

-- ========================================
-- 7. VERIFY FUNCTIONS CREATED
-- ========================================

SELECT 
    'FUNCTIONS CREATED' as info,
    proname as function_name,
    proargnames as parameters,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
    'get_merchant_orders_with_products', 
    'get_merchant_order_details', 
    'get_merchant_orders_with_cart_items',
    'get_merchant_orders_with_quotation_data'
)
ORDER BY proname;

-- ========================================
-- 8. TEST THE FUNCTIONS
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

-- Test quotation data function
SELECT 
    'TEST QUOTATION DATA FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_quotation_data('MC-2025-TXYR')
LIMIT 3;