-- Simple fix for LPAD function error
-- The issue is likely that LPAD is being called with wrong parameter types

-- First, let's drop any existing problematic triggers
DROP TRIGGER IF EXISTS generate_order_code_trigger ON orders;
DROP TRIGGER IF EXISTS generate_quotation_code_trigger ON quotations;
DROP TRIGGER IF EXISTS generate_merchant_code_trigger ON merchants;

-- Create a simple order code generation function
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
    
    -- Generate order code using string concatenation instead of LPAD
    v_order_code := 'ORD-' || v_year || '-' || RIGHT('0000' || v_next_number::TEXT, 4);
    
    NEW.order_code := v_order_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER generate_order_code_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_code IS NULL)
    EXECUTE FUNCTION generate_order_code();

-- Test the function
SELECT generate_order_code() as test_function;