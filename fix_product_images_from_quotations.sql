-- FIX PRODUCT IMAGES FROM QUOTATIONS
-- This fixes the image loading by properly extracting images from quotation data

-- ========================================
-- 1. CHECK CURRENT IMAGE DATA IN ORDER_ITEMS
-- ========================================
SELECT 
    'Current Image Data Check' as check_type,
    oi.id,
    oi.quotation_product_image,
    (oi.quotation_specifications->>'image')::text as extracted_image,
    (oi.quotation_specifications->>'product_name')::text as product_name,
    o.order_code
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.quotation_item_index;

-- ========================================
-- 2. CHECK QUOTATION DATA FOR IMAGES
-- ========================================
SELECT 
    'Quotation Image Data' as check_type,
    q.quotation_code,
    jsonb_array_elements(q.items) as item
FROM quotations q
WHERE q.quotation_code = 'QC-2025-0025';

-- ========================================
-- 3. UPDATE ORDER_ITEMS WITH QUOTATION IMAGES
-- ========================================
UPDATE order_items 
SET quotation_product_image = COALESCE(
    (quotation_specifications->>'image')::text,
    quotation_product_image,
    '/assets/placeholder.svg'
)
WHERE quotation_specifications IS NOT NULL 
AND quotation_specifications->>'image' IS NOT NULL
AND quotation_specifications->>'image' != '';

-- ========================================
-- 4. UPDATE MERCHANT ORDERS FUNCTION TO RETURN PROPER IMAGES
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
                        oi.quotation_product_name,
                        (oi.quotation_specifications->>'product_name')::text,
                        p.name,
                        'Unknown Product'
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,
                        (oi.quotation_specifications->>'image')::text,
                        p.image_url,
                        '/assets/placeholder.svg'
                    ),
                    'quantity', COALESCE(oi.quantity, 1),
                    'unit_price', COALESCE(oi.unit_price, 0),
                    'subtotal', COALESCE(oi.subtotal, 0),
                    'merchant_code', oi.merchant_code,
                    'quotation_id', oi.quotation_id,
                    'quotation_item_index', oi.quotation_item_index,
                    'quotation_specifications', oi.quotation_specifications
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
-- 5. UPDATE ORDER DETAILS FUNCTION TO RETURN PROPER IMAGES
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
                        oi.quotation_product_name,
                        (oi.quotation_specifications->>'product_name')::text,
                        p.name,
                        'Unknown Product'
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,
                        (oi.quotation_specifications->>'image')::text,
                        p.image_url,
                        '/assets/placeholder.svg'
                    ),
                    'quantity', COALESCE(oi.quantity, 1),
                    'unit_price', COALESCE(oi.unit_price, 0),
                    'subtotal', COALESCE(oi.subtotal, 0),
                    'merchant_code', oi.merchant_code,
                    'quotation_id', oi.quotation_id,
                    'quotation_item_index', oi.quotation_item_index,
                    'quotation_specifications', oi.quotation_specifications
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
-- 6. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- ========================================
-- 7. VERIFY THE FIX
-- ========================================
-- Check the updated order_items for ORD-2025-0005
SELECT 
    'Updated Order Items with Images' as check_type,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    (oi.quotation_specifications->>'image')::text as extracted_image,
    o.order_code
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.quotation_item_index;

-- Test the functions
SELECT 'Testing Updated Functions' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');