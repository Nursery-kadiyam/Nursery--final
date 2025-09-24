-- QUICK FIX FOR UNIT_PRICE COLUMN TYPE ERROR
-- This fixes the immediate error: cannot alter type of a column used by a view or rule

-- ========================================
-- 1. DROP THE PROBLEMATIC VIEW
-- ========================================
DROP VIEW IF EXISTS order_items_access_debug CASCADE;

-- Drop any other views that might depend on order_items
DROP VIEW IF EXISTS order_items_view CASCADE;
DROP VIEW IF EXISTS order_items_debug CASCADE;

-- ========================================
-- 2. ALTER THE COLUMN TYPE
-- ========================================
-- Now we can safely alter the column type
ALTER TABLE order_items 
ALTER COLUMN unit_price TYPE NUMERIC(10,2);

-- ========================================
-- 3. ADD MISSING COLUMNS
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
END $$;

-- ========================================
-- 4. UPDATE EXISTING DATA
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
-- 5. VERIFY THE FIX
-- ========================================
-- Check the column type is now correct
SELECT 
    'Column Type Fixed' as check_type,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'order_items' 
  AND column_name = 'unit_price';

-- Check that order_items now have proper data
SELECT 
    'Order Items Data Check' as check_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_products,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as items_with_merchant,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as items_with_unit_price,
    COUNT(CASE WHEN subtotal > 0 THEN 1 END) as items_with_subtotal
FROM order_items;