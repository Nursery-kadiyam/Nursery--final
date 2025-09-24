-- COMPREHENSIVE FIX FOR PRODUCT NAMES AND IMAGES
-- Fixes product name and image display across the entire app

-- 1. Check current product data and relationships
SELECT 
    'Product Data Check' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as products_with_images
FROM products;

-- 2. Check order_items and their product relationships
SELECT 
    'Order Items Check' as check_type,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_product_id,
    COUNT(CASE WHEN oi.product_id IS NOT NULL AND p.name IS NOT NULL THEN 1 END) as items_with_product_names
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id;

-- 3. Update the merchant orders function to properly join with products
CREATE OR REPLACE FUNCTION get_merchant_orders_privacy_protected(p_merchant_code TEXT)
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
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        ('Buyer #' || substring(o.user_id::text, 1, 4))::TEXT as buyer_reference,
        o.status::CHARACTER VARYING as status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        o.created_at,
        COALESCE(oi_agg.items_count, 0)::BIGINT as items_count,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            COUNT(*)::BIGINT as items_count,
            SUM(oi.subtotal) as total_amount,
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
        WHERE oi.merchant_code = p_merchant_code
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the merchant order details function
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
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        ('Buyer #' || substring(o.user_id::text, 1, 4))::TEXT as buyer_reference,
        o.status::CHARACTER VARYING as status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        o.created_at,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            SUM(oi.subtotal) as total_amount,
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
        WHERE oi.merchant_code = p_merchant_code
        AND oi.order_id = p_order_id
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.id = p_order_id
    AND o.merchant_code = p_merchant_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a comprehensive user orders function
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

-- 6. Populate missing order_items for ORD-2025-0005 with proper product linking
INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    price,
    unit_price,
    subtotal,
    merchant_code,
    quotation_id,
    created_at
)
SELECT 
    o.id as order_id,
    -- Try to find product by name with better matching
    (SELECT id FROM products 
     WHERE name ILIKE '%' || REPLACE(item->>'name', ' ', '%') || '%' 
     OR name ILIKE '%' || (item->>'name') || '%'
     LIMIT 1) as product_id,
    COALESCE((item->>'quantity')::integer, 1) as quantity,
    COALESCE((item->>'price')::numeric, 0) as price,
    COALESCE((item->>'unit_price')::numeric, 
              CASE 
                  WHEN (item->>'quantity')::integer > 0 
                  THEN (item->>'price')::numeric / (item->>'quantity')::integer 
                  ELSE 0 
              END) as unit_price,
    COALESCE((item->>'price')::numeric, 0) as subtotal,
    o.merchant_code,
    o.quotation_code,
    NOW() as created_at
FROM orders o
CROSS JOIN jsonb_array_elements(o.cart_items) AS item
WHERE o.order_code = 'ORD-2025-0005'
    AND o.cart_items IS NOT NULL
    AND o.cart_items != '[]'::jsonb
    AND o.cart_items != 'null'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = o.id
    );

-- 7. Update existing order_items with correct unit_price and subtotal
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 AND unit_price = 0 THEN price / quantity 
    ELSE unit_price 
END
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
)
AND subtotal = 0;

-- 8. Grant permissions for all functions
GRANT EXECUTE ON FUNCTION get_merchant_orders_privacy_protected TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_orders_with_items TO authenticated;

-- 9. Test the functions
SELECT 
    'Testing Merchant Function' as check_type,
    *
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR');

-- 10. Verify specific order ORD-2025-0005
SELECT 
    'Order ORD-2025-0005 Verification' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    array_agg(
        jsonb_build_object(
            'id', oi.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'image_url', p.image_url,
            'merchant_code', oi.merchant_code
        )
    ) as order_items_details
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code;

-- 11. Check for any missing product links
SELECT 
    'Missing Product Links Check' as check_type,
    COUNT(*) as order_items_without_products
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL;