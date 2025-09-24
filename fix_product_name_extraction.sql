-- FIX PRODUCT NAME EXTRACTION FROM QUOTATION SPECIFICATIONS
-- This fixes the issue where quotation_specifications contains the real product names
-- but the product_name field still shows "Unknown Product"

-- ========================================
-- 1. UPDATE EXISTING ORDER_ITEMS WITH QUOTATION PRODUCT NAMES
-- ========================================
UPDATE order_items 
SET quotation_product_name = COALESCE(
    (quotation_specifications->>'product_name')::text,
    quotation_product_name,
    'Unknown Product'
)
WHERE quotation_specifications IS NOT NULL 
AND quotation_specifications->>'product_name' IS NOT NULL
AND quotation_specifications->>'product_name' != '';

-- ========================================
-- 2. UPDATE EXISTING ORDER_ITEMS WITH QUOTATION PRODUCT IMAGES
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
-- 3. UPDATE MERCHANT ORDERS FUNCTION TO USE QUOTATION SPECIFICATIONS
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
                        oi.quotation_product_name,  -- Use stored quotation product name first
                        (oi.quotation_specifications->>'product_name')::text,  -- Extract from quotation_specifications
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use stored quotation product image first
                        (oi.quotation_specifications->>'image')::text,  -- Extract from quotation_specifications
                        p.image_url,                 -- Then products table image
                        '/assets/placeholder.svg'    -- Finally fallback
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
-- 4. UPDATE ORDER DETAILS FUNCTION TO USE QUOTATION SPECIFICATIONS
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
                        oi.quotation_product_name,  -- Use stored quotation product name first
                        (oi.quotation_specifications->>'product_name')::text,  -- Extract from quotation_specifications
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use stored quotation product image first
                        (oi.quotation_specifications->>'image')::text,  -- Extract from quotation_specifications
                        p.image_url,                 -- Then products table image
                        '/assets/placeholder.svg'    -- Finally fallback
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
-- 5. UPDATE USER ORDERS FUNCTION TO USE QUOTATION SPECIFICATIONS
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
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(
                        oi.quotation_product_name,  -- Use stored quotation product name first
                        (oi.quotation_specifications->>'product_name')::text,  -- Extract from quotation_specifications
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use stored quotation product image first
                        (oi.quotation_specifications->>'image')::text,  -- Extract from quotation_specifications
                        p.image_url,                 -- Then products table image
                        '/assets/placeholder.svg'    -- Finally fallback
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
        WHERE oi.order_id IN (
            SELECT id FROM orders WHERE user_id = p_user_id
        )
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.user_id = p_user_id
    ORDER BY COALESCE(o.created_at, NOW()) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_products TO authenticated;

-- ========================================
-- 7. VERIFY THE FIX
-- ========================================
-- Check the updated order_items for ORD-2025-0005
SELECT 
    'Updated Order Items for ORD-2025-0005' as check_type,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.quotation_item_index,
    o.order_code,
    (oi.quotation_specifications->>'product_name')::text as extracted_product_name
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.quotation_item_index;

-- Test the functions
SELECT 'Testing Updated Functions' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');