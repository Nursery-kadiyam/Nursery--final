-- COMPREHENSIVE PRODUCT DISPLAY FIX
-- This fixes the issue where some orders don't show plant names and images

-- ========================================
-- 1. FIRST, LET'S CHECK CURRENT STATE
-- ========================================
SELECT 
    'Current State Analysis' as check_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN oi.id IS NOT NULL THEN 1 END) as orders_with_order_items,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as order_items_with_products,
    COUNT(CASE WHEN o.cart_items IS NOT NULL AND o.cart_items != '[]'::jsonb THEN 1 END) as orders_with_cart_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id;

-- ========================================
-- 2. ADD MISSING COLUMNS TO ORDER_ITEMS TABLE
-- ========================================
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add merchant_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'merchant_code') THEN
        ALTER TABLE order_items ADD COLUMN merchant_code TEXT;
    END IF;
    
    -- Add quotation_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quotation_id') THEN
        ALTER TABLE order_items ADD COLUMN quotation_id TEXT;
    END IF;
    
    -- Add subtotal column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'subtotal') THEN
        ALTER TABLE order_items ADD COLUMN subtotal NUMERIC(10,2);
    END IF;
    
    -- Add unit_price column if it doesn't exist or is wrong type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'unit_price') THEN
        ALTER TABLE order_items ADD COLUMN unit_price NUMERIC(10,2);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'unit_price' AND data_type = 'integer') THEN
        ALTER TABLE order_items ALTER COLUMN unit_price TYPE NUMERIC(10,2);
    END IF;
END $$;

-- ========================================
-- 3. POPULATE ORDER_ITEMS FROM CART_ITEMS
-- ========================================
-- Insert order_items for orders that have cart_items but no order_items
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
        -- Strategy 1: Exact name match with merchant
        (SELECT id FROM products 
         WHERE name = item->>'name' AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 2: Case-insensitive match with merchant
        (SELECT id FROM products 
         WHERE LOWER(name) = LOWER(item->>'name') AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 3: Partial match with merchant
        (SELECT id FROM products 
         WHERE name ILIKE '%' || (item->>'name') || '%' AND merchant_code = o.merchant_code LIMIT 1),
        
        -- Strategy 4: Any product from the same merchant (fallback)
        (SELECT id FROM products 
         WHERE merchant_code = o.merchant_code LIMIT 1),
         
        -- Strategy 5: Any product with matching name (last resort)
        (SELECT id FROM products 
         WHERE name = item->>'name' LIMIT 1)
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
    )
    AND item->>'name' IS NOT NULL
    AND item->>'name' != '';

-- ========================================
-- 4. UPDATE EXISTING ORDER_ITEMS
-- ========================================
-- Update existing order_items with missing data
UPDATE order_items 
SET merchant_code = o.merchant_code,
    quotation_id = o.quotation_code
FROM orders o
WHERE order_items.order_id = o.id
    AND (order_items.merchant_code IS NULL OR order_items.quotation_id IS NULL);

-- Update unit_price and subtotal for existing items
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

-- ========================================
-- 5. CREATE ENHANCED ORDER FETCHING FUNCTION
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
    RETURN QUERY
    SELECT 
        o.id,
        o.order_code,
        o.total_amount,
        o.status::CHARACTER VARYING,
        o.created_at,
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
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.subtotal,
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
                WHEN o.cart_items IS NOT NULL AND o.cart_items != '[]'::jsonb
                THEN o.cart_items
                ELSE '[]'::jsonb
            END
        ) as order_items
    FROM orders o
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. CREATE MERCHANT ORDERS FUNCTION
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
                    'product_image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
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
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION get_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;

-- ========================================
-- 8. VERIFY THE FIX
-- ========================================
SELECT 
    'After Fix Verification' as check_type,
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
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.order_code, o.merchant_code
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 9. TEST THE NEW FUNCTIONS
-- ========================================
-- Test user orders function
SELECT 'Testing get_orders_with_products function' as test_type;
-- This will be tested with actual user data

-- Test merchant orders function  
SELECT 'Testing get_merchant_orders_with_products function' as test_type;
-- This will be tested with actual merchant data