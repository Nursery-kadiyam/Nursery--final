-- COMPREHENSIVE FIX FOR QUOTATION PRODUCT NAMES
-- This fixes the issue for current and future orders by properly extracting product names from quotations

-- ========================================
-- 1. ADD COLUMNS TO ORDER_ITEMS FOR REAL PRODUCT DATA
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
    
    -- Add quotation_item_index column to track which item from quotation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_item_index') THEN
        ALTER TABLE order_items ADD COLUMN quotation_item_index INTEGER;
    END IF;
END $$;

-- ========================================
-- 2. CREATE FUNCTION TO EXTRACT PRODUCT DATA FROM QUOTATIONS
-- ========================================
CREATE OR REPLACE FUNCTION extract_product_data_from_quotations()
RETURNS void AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    item_index INTEGER;
    quotation_items JSONB;
BEGIN
    -- Loop through all orders that have quotation_code
    FOR order_record IN 
        SELECT id, quotation_code, merchant_code 
        FROM orders 
        WHERE quotation_code IS NOT NULL 
        AND quotation_code != ''
    LOOP
        -- Get quotation items for this order
        SELECT items INTO quotation_items
        FROM quotations 
        WHERE quotation_code = order_record.quotation_code
        LIMIT 1;
        
        IF quotation_items IS NOT NULL THEN
            item_index := 0;
            
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
                    (item->>'delivery_timeline')::text as delivery_timeline
                FROM jsonb_array_elements(quotation_items) AS item
            LOOP
                -- Update the corresponding order_item
                UPDATE order_items 
                SET 
                    product_name = COALESCE(item_record.name, 'Unknown Product'),
                    product_image = COALESCE(item_record.image, '/assets/placeholder.svg'),
                    quotation_item_index = item_index
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
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. EXECUTE THE FUNCTION TO UPDATE EXISTING DATA
-- ========================================
SELECT extract_product_data_from_quotations();

-- ========================================
-- 4. CREATE TRIGGER FOR FUTURE ORDERS
-- ========================================
-- Create a function that will be called when new order_items are inserted
CREATE OR REPLACE FUNCTION update_order_item_from_quotation()
RETURNS TRIGGER AS $$
DECLARE
    quotation_items JSONB;
    item_data JSONB;
    item_index INTEGER;
BEGIN
    -- Get the quotation data for this order
    SELECT q.items INTO quotation_items
    FROM quotations q
    JOIN orders o ON q.quotation_code = o.quotation_code
    WHERE o.id = NEW.order_id
    LIMIT 1;
    
    IF quotation_items IS NOT NULL THEN
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
        
        -- Update the order_item with real product data
        NEW.product_name := COALESCE((item_data->>'name')::text, 'Unknown Product');
        NEW.product_image := COALESCE((item_data->>'image')::text, '/assets/placeholder.svg');
        NEW.quotation_item_index := item_index;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_order_item_from_quotation ON order_items;
CREATE TRIGGER trigger_update_order_item_from_quotation
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_item_from_quotation();

-- ========================================
-- 5. UPDATE THE MERCHANT ORDERS FUNCTION
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
                    'quotation_id', oi.quotation_id,
                    'quotation_item_index', oi.quotation_item_index
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
                    'quotation_id', oi.quotation_id,
                    'quotation_item_index', oi.quotation_item_index
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
-- Check the updated order_items for ORD-2025-0005
SELECT 
    'Updated Order Items for ORD-2025-0005' as check_type,
    oi.id,
    oi.product_name,
    oi.product_image,
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