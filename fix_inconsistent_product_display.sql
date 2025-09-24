-- FIX INCONSISTENT PRODUCT DISPLAY ISSUE
-- This fixes the problem where some orders show product names/images while others don't

-- 1. First, let's check the current state
SELECT 
    'Current State Analysis' as check_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN oi.id IS NOT NULL THEN 1 END) as orders_with_order_items,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as order_items_with_products
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id;

-- 2. Check specific problematic orders
SELECT 
    'Problematic Orders Check' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as linked_products_count,
    COUNT(CASE WHEN p.name IS NOT NULL AND p.name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN 1 END) as products_with_images
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code IN ('ORD-2025-0005', 'ORD-2025-0004')
GROUP BY o.id, o.order_code, o.merchant_code;

-- 3. Fix missing order_items for all orders that have cart_items but no order_items
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
    -- Try multiple strategies to find the product
    COALESCE(
        -- Strategy 1: Exact name match
        (SELECT id FROM products 
         WHERE name = item->>'name' AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 2: Case-insensitive match
        (SELECT id FROM products 
         WHERE LOWER(name) = LOWER(item->>'name') AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 3: Partial match
        (SELECT id FROM products 
         WHERE name ILIKE '%' || (item->>'name') || '%' AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 4: Any product from the same merchant (fallback)
        (SELECT id FROM products 
         WHERE merchant_code = o.merchant_code LIMIT 1)
    ) as product_id,
    
    COALESCE((item->>'quantity')::integer, 1) as quantity,
    COALESCE((item->>'price')::numeric, 0) as price,
    COALESCE(
        (item->>'unit_price')::numeric,
        CASE 
            WHEN (item->>'quantity')::integer > 0 
            THEN (item->>'price')::numeric / (item->>'quantity')::integer 
            ELSE 0 
        END
    ) as unit_price,
    COALESCE((item->>'price')::numeric, 0) as subtotal,
    o.merchant_code,
    o.quotation_code,
    NOW() as created_at
FROM orders o
CROSS JOIN jsonb_array_elements(o.cart_items) AS item
WHERE o.cart_items IS NOT NULL
    AND o.cart_items != '[]'::jsonb
    AND o.cart_items != 'null'::jsonb
    AND o.cart_items::text != 'order_items'
    AND NOT EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = o.id
    );

-- 4. Update existing order_items with correct unit_price and subtotal
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 AND (unit_price = 0 OR unit_price IS NULL) 
    THEN price / quantity 
    ELSE unit_price 
END
WHERE unit_price = 0 OR unit_price IS NULL;

UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE subtotal = 0 OR subtotal IS NULL;

-- 5. Fix any order_items that don't have product links
UPDATE order_items 
SET product_id = (
    SELECT id FROM products 
    WHERE merchant_code = order_items.merchant_code 
    LIMIT 1
)
WHERE product_id IS NULL;

-- 6. Update the merchant orders function to handle missing product data better
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
                    'product_name', COALESCE(p.name, 'Product #' || substring(oi.product_id::text, 1, 8), 'Unknown Product'),
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

-- 7. Update the merchant order details function
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
                    'product_name', COALESCE(p.name, 'Product #' || substring(oi.product_id::text, 1, 8), 'Unknown Product'),
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

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_privacy_protected TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- 9. Test the fix
SELECT 
    'After Fix - ORD-2025-0005 Test' as check_type,
    *
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- 10. Verify all orders now have proper product data
SELECT 
    'Final Verification' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as linked_products_count,
    COUNT(CASE WHEN p.name IS NOT NULL AND p.name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN 1 END) as products_with_images,
    CASE 
        WHEN COUNT(oi.id) = 0 THEN 'NO ITEMS'
        WHEN COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) = COUNT(oi.id) THEN 'ALL LINKED'
        ELSE 'SOME MISSING LINKS'
    END as status
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.merchant_code = 'MC-2025-TXYR'
GROUP BY o.id, o.order_code, o.merchant_code
ORDER BY o.created_at DESC;