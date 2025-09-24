-- DEBUG AND FIX ORDERS FUNCTION
-- This fixes the 400 error when calling get_orders_with_products

-- ========================================
-- 1. FIRST, LET'S CHECK IF THE FUNCTION EXISTS
-- ========================================
SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_orders_with_products', 'get_merchant_orders_with_products')
AND routine_schema = 'public';

-- ========================================
-- 2. DROP AND RECREATE THE FUNCTION WITH PROPER ERROR HANDLING
-- ========================================
DROP FUNCTION IF EXISTS get_orders_with_products(UUID);
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(TEXT);

-- ========================================
-- 3. CREATE A SIMPLER, MORE ROBUST FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_orders_with_products(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    order_code CHARACTER VARYING,
    total_amount NUMERIC,
    status CHARACTER VARYING,
    created_at TIMESTAMP WITH TIME ZONE,
    quotation_code CHARACTER VARYING,
    merchant_code CHARACTER VARYING,
    delivery_address JSONB,
    order_items JSONB
) AS $$
BEGIN
    -- Check if user_id is valid
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.order_code,
        COALESCE(o.total_amount, 0) as total_amount,
        COALESCE(o.status, 'pending')::CHARACTER VARYING as status,
        COALESCE(o.created_at, NOW()) as created_at,
        o.quotation_code,
        o.merchant_code,
        o.delivery_address,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', COALESCE(p.name, 'Unknown Product'),
                        'product_image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                        'quantity', COALESCE(oi.quantity, 1),
                        'unit_price', COALESCE(oi.unit_price, 0),
                        'subtotal', COALESCE(oi.subtotal, 0),
                        'merchant_code', oi.merchant_code,
                        'quotation_id', oi.quotation_id
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id
            ),
            -- Fallback to cart_items if no order_items
            CASE 
                WHEN o.cart_items IS NOT NULL AND o.cart_items != '[]'::jsonb AND o.cart_items != 'null'::jsonb
                THEN o.cart_items
                ELSE '[]'::jsonb
            END
        ) as order_items
    FROM orders o
    WHERE o.user_id = p_user_id
    ORDER BY COALESCE(o.created_at, NOW()) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CREATE MERCHANT ORDERS FUNCTION
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
) AS $$
BEGIN
    -- Check if merchant_code is valid
    IF p_merchant_code IS NULL OR p_merchant_code = '' THEN
        RAISE EXCEPTION 'Merchant code cannot be null or empty';
    END IF;

    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        COALESCE('Buyer #' || substring(o.user_id::text, 1, 4), 'Unknown Buyer')::TEXT as buyer_reference,
        COALESCE(o.status, 'pending')::CHARACTER VARYING as status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        COALESCE(o.created_at, NOW()) as created_at,
        COALESCE(oi_agg.items_count, 0)::BIGINT as items_count,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            COUNT(*)::BIGINT as items_count,
            SUM(COALESCE(oi.subtotal, 0)) as total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Unknown Product'),
                    'product_image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                    'quantity', COALESCE(oi.quantity, 1),
                    'unit_price', COALESCE(oi.unit_price, 0),
                    'subtotal', COALESCE(oi.subtotal, 0),
                    'merchant_code', oi.merchant_code,
                    'quotation_id', oi.quotation_id
                )
            ) as order_items
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.merchant_code = p_merchant_code
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.merchant_code = p_merchant_code
    ORDER BY COALESCE(o.created_at, NOW()) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 6. TEST THE FUNCTIONS
-- ========================================
-- Test with a sample user ID (replace with actual user ID)
SELECT 'Testing get_orders_with_products function' as test_type;

-- Test with a sample merchant code (replace with actual merchant code)
SELECT 'Testing get_merchant_orders_with_products function' as test_type;

-- ========================================
-- 7. CHECK FOR COMMON ISSUES
-- ========================================
-- Check if there are any orders for testing
SELECT 
    'Orders Check' as check_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as orders_with_user_id,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as orders_with_merchant_code
FROM orders;

-- Check if there are any order_items
SELECT 
    'Order Items Check' as check_type,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_products,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as items_with_merchant
FROM order_items;

-- Check if there are any products
SELECT 
    'Products Check' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as products_with_images
FROM products;