-- Fix Order Items Unit Price Mapping from Quotations
-- This script ensures that unit_price from quotations is properly mapped to order_items
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT ORDER_ITEMS STRUCTURE
-- ========================================
SELECT '=== CHECKING CURRENT ORDER_ITEMS STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('unit_price', 'unit_prices')
ORDER BY ordinal_position;

-- ========================================
-- 2. CHECK CURRENT DATA ISSUES
-- ========================================
SELECT '=== CHECKING CURRENT DATA ISSUES ===' as section;

-- Check orders with quotation_code but missing unit_price in order_items
SELECT 
    o.id as order_id,
    o.order_code,
    o.quotation_code,
    oi.id as order_item_id,
    oi.product_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    oi.unit_prices
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.quotation_code IS NOT NULL 
AND oi.unit_price IS NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 3. UPDATE EXISTING ORDER_ITEMS WITH UNIT_PRICE FROM QUOTATIONS
-- ========================================
SELECT '=== UPDATING EXISTING ORDER_ITEMS ===' as section;

-- Update order_items with unit_price from quotations
UPDATE order_items 
SET unit_price = (
    SELECT 
        CASE 
            WHEN q.unit_prices IS NOT NULL THEN
                -- Parse unit_prices JSON and get the price for this item index
                (q.unit_prices::jsonb->>(array_position(
                    array(
                        SELECT jsonb_array_elements_text(q.unit_prices::jsonb)
                    ), 
                    oi.price::text
                ) - 1))::integer
            ELSE 
                -- Fallback: calculate unit price from total price and quantity
                (oi.price / oi.quantity)::integer
        END
    FROM orders o
    JOIN quotations q ON o.quotation_code = q.quotation_code
    WHERE o.id = order_items.order_id
    AND o.quotation_code IS NOT NULL
)
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.id = order_items.order_id 
    AND o.quotation_code IS NOT NULL
)
AND unit_price IS NULL;

-- ========================================
-- 4. CREATE FUNCTION TO EXTRACT UNIT_PRICE FROM QUOTATION
-- ========================================
SELECT '=== CREATING UNIT_PRICE EXTRACTION FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION extract_unit_price_from_quotation(
    p_quotation_code TEXT,
    p_item_index INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_unit_price INTEGER;
    v_unit_prices JSONB;
BEGIN
    -- Get unit_prices from quotation
    SELECT unit_prices INTO v_unit_prices
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF v_unit_prices IS NOT NULL THEN
        -- Extract unit price for the specific item index
        v_unit_price := (v_unit_prices->>p_item_index)::integer;
    ELSE
        v_unit_price := 0;
    END IF;
    
    RETURN COALESCE(v_unit_price, 0);
END;
$$;

-- ========================================
-- 5. CREATE TRIGGER TO AUTO-SET UNIT_PRICE FROM QUOTATIONS
-- ========================================
SELECT '=== CREATING AUTO-SET UNIT_PRICE TRIGGER ===' as section;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_set_unit_price_from_quotation ON order_items;

-- Create function to auto-set unit_price
CREATE OR REPLACE FUNCTION auto_set_unit_price_from_quotation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_quotation_code TEXT;
    v_item_index INTEGER;
    v_unit_price INTEGER;
BEGIN
    -- Only process if unit_price is NULL and order has quotation_code
    IF NEW.unit_price IS NULL THEN
        -- Get quotation_code from the order
        SELECT quotation_code INTO v_quotation_code
        FROM orders 
        WHERE id = NEW.order_id;
        
        IF v_quotation_code IS NOT NULL THEN
            -- Try to find the item index in the quotation
            SELECT 
                array_position(
                    array(
                        SELECT jsonb_array_elements_text(unit_prices::jsonb)
                    ), 
                    NEW.price::text
                ) - 1
            INTO v_item_index
            FROM quotations 
            WHERE quotation_code = v_quotation_code;
            
            -- If we found the item index, get the unit price
            IF v_item_index IS NOT NULL AND v_item_index >= 0 THEN
                v_unit_price := extract_unit_price_from_quotation(v_quotation_code, v_item_index);
                NEW.unit_price := v_unit_price;
            ELSE
                -- Fallback: calculate unit price from total price and quantity
                NEW.unit_price := (NEW.price / NEW.quantity)::integer;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER auto_set_unit_price_from_quotation
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_unit_price_from_quotation();

-- ========================================
-- 6. UPDATE THE UPDATE_UNIT_PRICE FUNCTION
-- ========================================
SELECT '=== UPDATING UPDATE_UNIT_PRICE FUNCTION ===' as section;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_unit_price_trigger ON order_items;

-- Update the function to handle quotations
CREATE OR REPLACE FUNCTION update_unit_price()
RETURNS TRIGGER AS $$
DECLARE
    v_quotation_code TEXT;
    v_unit_price INTEGER;
BEGIN
    -- Only set unit_price if it's NULL
    IF NEW.unit_price IS NULL THEN
        -- Check if this order is from a quotation
        SELECT quotation_code INTO v_quotation_code
        FROM orders 
        WHERE id = NEW.order_id;
        
        IF v_quotation_code IS NOT NULL THEN
            -- Try to get unit_price from quotation
            v_unit_price := extract_unit_price_from_quotation(v_quotation_code, 0);
            IF v_unit_price > 0 THEN
                NEW.unit_price := v_unit_price;
            ELSE
                -- Fallback: calculate from price and quantity
                NEW.unit_price := (NEW.price / NEW.quantity)::integer;
            END IF;
        ELSE
            -- For non-quotation orders, use price as unit_price
            NEW.unit_price := NEW.price::integer;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_unit_price_trigger 
    BEFORE INSERT OR UPDATE ON order_items 
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_price();

-- ========================================
-- 7. VERIFY THE FIXES
-- ========================================
SELECT '=== VERIFYING THE FIXES ===' as section;

-- Check if there are still orders with missing unit_price
SELECT 
    COUNT(*) as orders_with_missing_unit_price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.quotation_code IS NOT NULL 
AND oi.unit_price IS NULL;

-- Show sample of fixed data
SELECT 
    o.order_code,
    o.quotation_code,
    oi.product_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    CASE 
        WHEN oi.unit_price IS NOT NULL THEN '✅ Fixed'
        ELSE '❌ Still Missing'
    END as status
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.quotation_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 8. TEST THE FUNCTION
-- ========================================
SELECT '=== TESTING THE FUNCTION ===' as section;

-- Test the function with a sample quotation
SELECT 
    quotation_code,
    unit_prices,
    extract_unit_price_from_quotation(quotation_code, 0) as unit_price_0,
    extract_unit_price_from_quotation(quotation_code, 1) as unit_price_1
FROM quotations 
WHERE unit_prices IS NOT NULL
LIMIT 3;

-- ========================================
-- 9. SUMMARY
-- ========================================
SELECT '=== FIX SUMMARY ===' as section;

SELECT 
    'Unit price mapping fix completed!' as status,
    'Triggers and functions created' as triggers,
    'Existing data updated' as data_update,
    'Future orders will auto-set unit_price from quotations' as future_orders;
