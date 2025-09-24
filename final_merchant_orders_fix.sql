-- FINAL MERCHANT ORDERS FIX
-- This fixes all data type mismatches by casting to the correct types

-- ========================================
-- 1. DROP EXISTING FUNCTION
-- ========================================

DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);

-- ========================================
-- 2. CREATE FUNCTION WITH CORRECT DATA TYPES
-- ========================================

CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    buyer_reference TEXT,
    status CHARACTER VARYING,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    items_count BIGINT,
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
        ('Buyer #' || SUBSTRING(o.id::text, 1, 4))::TEXT as buyer_reference,
        o.status,
        o.total_amount,
        o.created_at,
        (
            SELECT COUNT(*)
            FROM order_items oi
            WHERE oi.order_id = o.id
        ) as items_count,
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
-- 3. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 4. TEST THE FUNCTION
-- ========================================

SELECT 
    'TEST FUNCTION' as info,
    order_code,
    total_amount,
    status,
    items_count,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;