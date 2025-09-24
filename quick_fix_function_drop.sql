-- QUICK FIX: Drop and recreate the problematic function
-- This fixes the "cannot change return type of existing function" error

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_orders_with_items(UUID);

-- Recreate with the correct return type
CREATE OR REPLACE FUNCTION get_user_orders_with_items(p_user_id UUID)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    merchant_code TEXT,
    merchant_name TEXT,
    total_amount NUMERIC,
    status CHARACTER VARYING,
    created_at TIMESTAMP WITH TIME ZONE,
    delivery_address JSONB,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.merchant_code,
        COALESCE(m.nursery_name, 'Admin Store') as merchant_name,
        o.total_amount,
        o.status::CHARACTER VARYING as status,
        o.created_at,
        o.delivery_address,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN merchants m ON o.merchant_code = m.merchant_code
    LEFT JOIN (
        SELECT 
            oi.order_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Unknown Product'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
                    'image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                    'merchant_code', oi.merchant_code
                )
            ) as order_items
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN (
            SELECT id FROM orders WHERE user_id = p_user_id
        )
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_orders_with_items TO authenticated;

-- Test the function
SELECT 
    'Function Created Successfully' as status,
    proname as function_name,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'get_user_orders_with_items';