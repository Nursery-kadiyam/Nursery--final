-- Quick fix for LPAD function error
-- This script can be run directly in your Supabase SQL editor

-- 1. Drop existing problematic triggers
DROP TRIGGER IF EXISTS generate_order_code_trigger ON orders;
DROP TRIGGER IF EXISTS generate_quotation_code_trigger ON quotations;
DROP TRIGGER IF EXISTS generate_merchant_code_trigger ON merchants;

-- 2. Create a simple order code generation function
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

-- 3. Create the trigger
CREATE TRIGGER generate_order_code_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_code IS NULL)
    EXECUTE FUNCTION generate_order_code();

-- 4. Test the function
SELECT 'Testing order code generation...' as message;
SELECT generate_order_code() as test_result;