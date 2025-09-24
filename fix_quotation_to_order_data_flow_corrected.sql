-- COMPREHENSIVE FIX FOR QUOTATION TO ORDER DATA FLOW - CORRECTED
-- This fixes the core issue where quotation-specific product data is lost during order creation

-- ========================================
-- 1. ADD MISSING COLUMNS TO ORDER_ITEMS
-- ========================================
DO $$ 
BEGIN
    -- Add quotation-specific product data columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_product_name') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_product_image') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_item_index') THEN
        ALTER TABLE order_items ADD COLUMN quotation_item_index INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_specifications') THEN
        ALTER TABLE order_items ADD COLUMN quotation_specifications JSONB;
    END IF;
END $$;

-- ========================================
-- 2. CREATE FUNCTION TO EXTRACT QUOTATION DATA
-- ========================================
CREATE OR REPLACE FUNCTION extract_quotation_data_for_order(p_order_id UUID)
RETURNS void AS $$
DECLARE
    order_record RECORD;
    quotation_items JSONB;
    item_record RECORD;
    item_index INTEGER := 0;
BEGIN
    -- Get the order and its quotation data
    SELECT o.id, o.quotation_code, o.merchant_code, q.items
    INTO order_record
    FROM orders o
    LEFT JOIN quotations q ON o.quotation_code = q.quotation_code
    WHERE o.id = p_order_id;
    
    IF order_record.quotation_code IS NOT NULL AND order_record.items IS NOT NULL THEN
        quotation_items := order_record.items;
        
        -- Loop through each item in the quotation
        FOR item_record IN
            SELECT 
                (item->>'name')::text as name,
                (item->>'image')::text as image,
                (item->>'quantity')::integer as quantity,
                (item->>'price')::numeric as price,
                (item->>'unit_price')::numeric as unit_price,
                (item->>'variety')::text as variety,
                (item->>'plant_type')::text as plant_type,
                (item->>'age_category')::text as age_category,
                (item->>'bag_size')::text as bag_size,
                (item->>'height_range')::text as height_range,
                (item->>'stem_thickness')::text as stem_thickness,
                (item->>'weight')::text as weight,
                (item->>'is_grafted')::boolean as is_grafted,
                (item->>'delivery_timeline')::text as delivery_timeline,
                item as full_item_data
            FROM jsonb_array_elements(quotation_items) AS item
        LOOP
            -- Update the corresponding order_item with quotation data
            UPDATE order_items 
            SET 
                quotation_product_name = COALESCE(item_record.name, 'Unknown Product'),
                quotation_product_image = COALESCE(item_record.image, '/assets/placeholder.svg'),
                quotation_item_index = item_index,
                quotation_specifications = item_record.full_item_data
            WHERE order_id = p_order_id 
            AND merchant_code = order_record.merchant_code
            AND id IN (
                SELECT id FROM order_items 
                WHERE order_id = p_order_id 
                AND merchant_code = order_record.merchant_code
                ORDER BY created_at
                LIMIT 1 OFFSET item_index
            );
            
            item_index := item_index + 1;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. UPDATE EXISTING ORDER_ITEMS WITH QUOTATION DATA
-- ========================================
-- Extract quotation data for all existing orders
DO $$
DECLARE
    order_record RECORD;
BEGIN
    FOR order_record IN 
        SELECT id FROM orders 
        WHERE quotation_code IS NOT NULL 
        AND quotation_code != ''
    LOOP
        PERFORM extract_quotation_data_for_order(order_record.id);
    END LOOP;
END $$;

-- ========================================
-- 4. CREATE TRIGGER FOR FUTURE ORDERS
-- ========================================
CREATE OR REPLACE FUNCTION update_order_item_with_quotation_data()
RETURNS TRIGGER AS $$
DECLARE
    quotation_items JSONB;
    item_data JSONB;
    item_index INTEGER;
    order_quotation_code TEXT;
    order_merchant_code TEXT;
BEGIN
    -- Get the quotation data for this order
    SELECT o.quotation_code, o.merchant_code, q.items
    INTO order_quotation_code, order_merchant_code, quotation_items
    FROM orders o
    LEFT JOIN quotations q ON o.quotation_code = q.quotation_code
    WHERE o.id = NEW.order_id;
    
    IF order_quotation_code IS NOT NULL AND quotation_items IS NOT NULL THEN
        -- Get the item index for this order_item
        SELECT COUNT(*) INTO item_index
        FROM order_items
        WHERE order_id = NEW.order_id
        AND merchant_code = NEW.merchant_code
        AND created_at <= NEW.created_at;
        
        -- Extract the corresponding item from quotation
        SELECT jsonb_array_elements(quotation_items) INTO item_data
        FROM jsonb_array_elements(quotation_items) WITH ORDINALITY AS t(item, idx)
        WHERE idx = item_index + 1;
        
        -- Update the order_item with quotation data
        NEW.quotation_product_name := COALESCE((item_data->>'name')::text, 'Unknown Product');
        NEW.quotation_product_image := COALESCE((item_data->>'image')::text, '/assets/placeholder.svg');
        NEW.quotation_item_index := item_index;
        NEW.quotation_specifications := item_data;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_order_item_with_quotation_data ON order_items;
CREATE TRIGGER trigger_update_order_item_with_quotation_data
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_item_with_quotation_data();

-- ========================================
-- 5. UPDATE MERCHANT ORDERS FUNCTION - CORRECTED
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
                        oi.quotation_product_name,  -- Use quotation product name first
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use quotation product image first
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
-- 6. UPDATE ORDER DETAILS FUNCTION - CORRECTED
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
                        oi.quotation_product_name,  -- Use quotation product name first
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use quotation product image first
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
-- 7. UPDATE USER ORDERS FUNCTION - CORRECTED
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
                        oi.quotation_product_name,  -- Use quotation product name first
                        p.name,                     -- Then products table name
                        'Unknown Product'           -- Finally fallback
                    ),
                    'product_image', COALESCE(
                        oi.quotation_product_image,  -- Use quotation product image first
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
-- 8. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_products TO authenticated;

-- ========================================
-- 9. VERIFY THE FIX
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
    o.order_code
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
ORDER BY oi.quotation_item_index;

-- Test the functions
SELECT 'Testing Updated Functions' as test_type;
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');