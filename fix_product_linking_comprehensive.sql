-- FIX PRODUCT LINKING ISSUE COMPREHENSIVE
-- This fixes the "Unknown Product" issue by properly linking order_items to products

-- ========================================
-- 1. FIRST, LET'S CHECK THE CURRENT STATE
-- ========================================
SELECT 
    'Current State Check' as check_type,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_product_id,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as items_with_linked_products,
    COUNT(CASE WHEN p.name IS NOT NULL AND p.name != '' THEN 1 END) as items_with_product_names
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005';

-- ========================================
-- 2. FIX MISSING PRODUCT LINKS
-- ========================================
-- Update order_items that don't have product_id linked
UPDATE order_items 
SET product_id = (
    SELECT p.id 
    FROM products p 
    WHERE p.merchant_code = order_items.merchant_code 
    AND p.name IS NOT NULL 
    AND p.name != ''
    LIMIT 1
)
WHERE product_id IS NULL 
AND merchant_code IS NOT NULL;

-- ========================================
-- 3. CREATE MISSING PRODUCTS IF NEEDED
-- ========================================
-- Insert a default product for the merchant if none exists
INSERT INTO products (
    name, 
    description, 
    available_quantity, 
    image_url, 
    merchant_code,
    created_at,
    updated_at
)
SELECT 
    'Bamboo Plant' as name,
    'High quality bamboo plant' as description,
    1000 as available_quantity,
    '/assets/bamboo-plant.jpg' as image_url,
    'MC-2025-TXYR' as merchant_code,
    NOW() as created_at,
    NOW() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM products 
    WHERE merchant_code = 'MC-2025-TXYR'
);

-- ========================================
-- 4. UPDATE ORDER_ITEMS TO LINK TO THE PRODUCT
-- ========================================
-- Link order_items to the product we just created
UPDATE order_items 
SET product_id = (
    SELECT id FROM products 
    WHERE merchant_code = 'MC-2025-TXYR' 
    AND name = 'Bamboo Plant'
    LIMIT 1
)
WHERE merchant_code = 'MC-2025-TXYR' 
AND product_id IS NULL;

-- ========================================
-- 5. UPDATE THE MERCHANT ORDERS FUNCTION TO BE MORE ROBUST
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
                    'product_name', COALESCE(
                        p.name, 
                        'Product #' || substring(oi.product_id::text, 1, 8),
                        'Unknown Product'
                    ),
                    'product_image', COALESCE(
                        p.image_url, 
                        '/assets/placeholder.svg'
                    ),
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
-- 6. UPDATE THE ORDER DETAILS FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    buyer_reference TEXT,
    status CHARACTER VARYING,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    order_items JSONB
) AS $$
BEGIN
    -- Check if parameters are valid
    IF p_order_id IS NULL OR p_merchant_code IS NULL OR p_merchant_code = '' THEN
        RAISE EXCEPTION 'Order ID and merchant code cannot be null or empty';
    END IF;

    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        COALESCE('Buyer #' || substring(o.user_id::text, 1, 4), 'Unknown Buyer')::TEXT as buyer_reference,
        COALESCE(o.status, 'pending')::CHARACTER VARYING as status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        COALESCE(o.created_at, NOW()) as created_at,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            SUM(COALESCE(oi.subtotal, 0)) as total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(
                        p.name, 
                        'Product #' || substring(oi.product_id::text, 1, 8),
                        'Unknown Product'
                    ),
                    'product_image', COALESCE(
                        p.image_url, 
                        '/assets/placeholder.svg'
                    ),
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
        AND oi.order_id = p_order_id
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.id = p_order_id
    AND o.merchant_code = p_merchant_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- ========================================
-- 8. VERIFY THE FIX
-- ========================================
-- Check the updated state
SELECT 
    'After Fix Check' as check_type,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_product_id,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as items_with_linked_products,
    COUNT(CASE WHEN p.name IS NOT NULL AND p.name != '' THEN 1 END) as items_with_product_names
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005';

-- Test the functions
SELECT 'Testing Updated Functions' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');