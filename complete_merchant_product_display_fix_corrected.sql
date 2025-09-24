-- COMPLETE FIX FOR MERCHANT PRODUCT DISPLAY (CORRECTED)
-- This fixes the "Unknown Product" issue in merchant dashboard

-- ========================================
-- 1. ADD MISSING COLUMNS TO ORDER_ITEMS
-- ========================================

-- Add quotation_product_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='quotation_product_name') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='quotation_product_image') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='subtotal') THEN
        ALTER TABLE order_items ADD COLUMN subtotal NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='merchant_code') THEN
        ALTER TABLE order_items ADD COLUMN merchant_code TEXT;
    END IF;
END $$;

-- ========================================
-- 2. BACKFILL EXISTING ORDER_ITEMS (CORRECTED)
-- ========================================

-- Update existing order_items with product data
UPDATE order_items oi
SET quotation_product_name = p.name,
    quotation_product_image = p.image_url,
    subtotal = oi.price * oi.quantity,
    merchant_code = o.merchant_code
FROM products p, orders o
WHERE oi.product_id = p.id 
  AND o.id = oi.order_id
  AND (oi.quotation_product_name IS NULL OR oi.quotation_product_image IS NULL);

-- ========================================
-- 3. CREATE TRIGGER TO AUTO-POPULATE DATA
-- ========================================

-- Replace trigger function to always populate quotation data
CREATE OR REPLACE FUNCTION update_order_item_with_quotation_data()
RETURNS trigger AS $$
BEGIN
    -- Populate product name and image from products table
    IF NEW.product_id IS NOT NULL THEN
        SELECT p.name, p.image_url
        INTO NEW.quotation_product_name, NEW.quotation_product_image
        FROM products p WHERE p.id = NEW.product_id;
    END IF;

    -- Get merchant_code from the order
    IF NEW.order_id IS NOT NULL THEN
        SELECT o.merchant_code
        INTO NEW.merchant_code
        FROM orders o WHERE o.id = NEW.order_id;
    END IF;

    -- Calculate subtotal
    NEW.subtotal := COALESCE(NEW.price,0) * COALESCE(NEW.quantity,1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_order_item_with_quotation_data ON order_items;
CREATE TRIGGER trigger_update_order_item_with_quotation_data
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_item_with_quotation_data();

-- ========================================
-- 4. FIX MERCHANT FUNCTIONS
-- ========================================

-- Drop and recreate the merchant orders function
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);

CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    buyer_reference TEXT,
    order_items JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        o.order_code, 
        o.status, 
        o.created_at, 
        o.total_amount,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(oi.quotation_product_name, p.name, 'Unknown Product'),
                    'product_image', COALESCE(oi.quotation_product_image, p.image_url, '/assets/placeholder.svg'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', COALESCE(oi.subtotal, oi.price * oi.quantity)
                )
            )
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        ), '[]'::jsonb) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Create order details function
DROP FUNCTION IF EXISTS get_merchant_order_details(uuid, text);

CREATE OR REPLACE FUNCTION get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    buyer_reference TEXT,
    order_items JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        o.order_code, 
        o.status, 
        o.created_at, 
        o.total_amount,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(oi.quotation_product_name, p.name, 'Unknown Product'),
                    'product_image', COALESCE(oi.quotation_product_image, p.image_url, '/assets/placeholder.svg'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', COALESCE(oi.subtotal, oi.price * oi.quantity)
                )
            )
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        ), '[]'::jsonb) as order_items
    FROM orders o
    WHERE o.id = p_order_id 
    AND o.merchant_code = p_merchant_code;
END;
$$;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- ========================================
-- 6. TEST THE FIX
-- ========================================

-- Test the function
SELECT 
    'TESTING FIXED FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;

-- Check if order_items now have product data
SELECT 
    'CHECKING ORDER_ITEMS DATA' as info,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.subtotal
FROM order_items oi
WHERE oi.quotation_product_name IS NOT NULL
LIMIT 5;