-- FIX REAL PRODUCT NAMES FROM QUOTATION DATA
-- This fixes the issue where products show as "Bamboo Plant" instead of real names

-- ========================================
-- 1. FIRST, LET'S CHECK THE QUOTATION DATA
-- ========================================
SELECT 
    'Quotation Data Check' as check_type,
    q.id,
    q.quotation_code,
    q.items,
    q.merchant_code
FROM quotations q
WHERE q.quotation_code = 'QC-2025-0025';

-- ========================================
-- 2. EXTRACT PRODUCT NAMES FROM QUOTATION ITEMS
-- ========================================
-- Let's see what's in the quotation items
SELECT 
    'Quotation Items' as check_type,
    q.quotation_code,
    jsonb_array_elements(q.items) as item
FROM quotations q
WHERE q.quotation_code = 'QC-2025-0025';

-- ========================================
-- 3. UPDATE ORDER_ITEMS WITH REAL PRODUCT NAMES
-- ========================================
-- Update order_items with actual product names from quotation data
UPDATE order_items 
SET 
    -- We'll add a product_name field to store the real name
    product_name = COALESCE(
        (SELECT (item->>'name')::text 
         FROM quotations q 
         CROSS JOIN jsonb_array_elements(q.items) AS item 
         WHERE q.quotation_code = (
             SELECT quotation_code 
             FROM orders 
             WHERE id = order_items.order_id
         )
         AND (item->>'name') IS NOT NULL 
         AND (item->>'name') != ''
         LIMIT 1
        ),
        'Unknown Product'
    )
WHERE merchant_code = 'MC-2025-TXYR';

-- ========================================
-- 4. ADD PRODUCT_NAME COLUMN IF IT DOESN'T EXIST
-- ========================================
DO $$ 
BEGIN
    -- Add product_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_name') THEN
        ALTER TABLE order_items ADD COLUMN product_name TEXT;
    END IF;
    
    -- Add product_image column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_image') THEN
        ALTER TABLE order_items ADD COLUMN product_image TEXT;
    END IF;
END $$;

-- ========================================
-- 5. UPDATE ORDER_ITEMS WITH REAL PRODUCT DATA FROM QUOTATIONS
-- ========================================
-- Create a function to extract product data from quotations
CREATE OR REPLACE FUNCTION update_order_items_from_quotations()
RETURNS void AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    item_index INTEGER := 0;
BEGIN
    -- Loop through all orders that have quotation_code
    FOR order_record IN 
        SELECT id, quotation_code, merchant_code 
        FROM orders 
        WHERE quotation_code IS NOT NULL 
        AND merchant_code = 'MC-2025-TXYR'
    LOOP
        -- Get quotation items for this order
        FOR item_record IN
            SELECT 
                (item->>'name')::text as name,
                (item->>'image')::text as image,
                (item->>'quantity')::integer as quantity,
                (item->>'price')::numeric as price,
                (item->>'unit_price')::numeric as unit_price
            FROM quotations q
            CROSS JOIN jsonb_array_elements(q.items) AS item
            WHERE q.quotation_code = order_record.quotation_code
        LOOP
            -- Update the corresponding order_item
            UPDATE order_items 
            SET 
                product_name = COALESCE(item_record.name, 'Unknown Product'),
                product_image = COALESCE(item_record.image, '/assets/placeholder.svg')
            WHERE order_id = order_record.id 
            AND merchant_code = order_record.merchant_code
            AND id IN (
                SELECT id FROM order_items 
                WHERE order_id = order_record.id 
                AND merchant_code = order_record.merchant_code
                ORDER BY created_at
                LIMIT 1 OFFSET item_index
            );
            
            item_index := item_index + 1;
        END LOOP;
        
        item_index := 0; -- Reset for next order
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_order_items_from_quotations();

-- ========================================
-- 6. UPDATE THE MERCHANT ORDERS FUNCTION TO USE REAL PRODUCT NAMES
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
                        oi.product_name,  -- Use the stored product_name first
                        p.name,           -- Then try the products table
                        'Unknown Product' -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.product_image,  -- Use the stored product_image first
                        p.image_url,       -- Then try the products table
                        '/assets/placeholder.svg' -- Finally fallback
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
-- 7. UPDATE THE ORDER DETAILS FUNCTION
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
                        oi.product_name,  -- Use the stored product_name first
                        p.name,           -- Then try the products table
                        'Unknown Product' -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.product_image,  -- Use the stored product_image first
                        p.image_url,       -- Then try the products table
                        '/assets/placeholder.svg' -- Finally fallback
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
-- 8. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- ========================================
-- 9. VERIFY THE FIX
-- ========================================
-- Check the updated order_items
SELECT 
    'Updated Order Items' as check_type,
    oi.id,
    oi.product_name,
    oi.product_image,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    o.order_code
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.created_at;

-- Test the functions
SELECT 'Testing Updated Functions' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');