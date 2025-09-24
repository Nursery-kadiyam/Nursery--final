-- Fix existing triggers and functions
-- This script drops existing functions and creates new ones

-- 1. Drop existing order code generation triggers
DROP TRIGGER IF EXISTS trigger_generate_child_order_code ON orders;
DROP TRIGGER IF EXISTS trigger_generate_parent_order_code ON orders;
DROP TRIGGER IF EXISTS trigger_generate_very_short_order_code ON orders;

-- 2. Drop existing order code generation functions
DROP FUNCTION IF EXISTS generate_child_order_code();
DROP FUNCTION IF EXISTS generate_parent_order_code();
DROP FUNCTION IF EXISTS generate_very_short_order_code();
DROP FUNCTION IF EXISTS generate_order_code();

-- 3. Create a new unified order code generation function
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_next_number INTEGER;
    v_order_code TEXT;
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_code FROM 'ORD-' || v_year || '-(.*)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM orders
    WHERE order_code LIKE 'ORD-' || v_year || '-%';
    
    -- Generate order code using simple string padding (no LPAD)
    v_order_code := 'ORD-' || v_year || '-' || 
                   CASE 
                       WHEN v_next_number < 10 THEN '000' || v_next_number::TEXT
                       WHEN v_next_number < 100 THEN '00' || v_next_number::TEXT
                       WHEN v_next_number < 1000 THEN '0' || v_next_number::TEXT
                       ELSE v_next_number::TEXT
                   END;
    
    NEW.order_code := v_order_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a single trigger for order code generation
CREATE TRIGGER generate_order_code_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_code IS NULL)
    EXECUTE FUNCTION generate_order_code();

-- 5. Test the function
SELECT 'Testing order code generation...' as message;
SELECT generate_order_code() as test_result;