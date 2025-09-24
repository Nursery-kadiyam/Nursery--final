-- Complete fix for all existing triggers and functions
-- This script safely replaces all problematic order code generation

-- 1. Drop all existing order code generation triggers
DROP TRIGGER IF EXISTS trigger_generate_child_order_code ON orders;
DROP TRIGGER IF EXISTS trigger_generate_parent_order_code ON orders;
DROP TRIGGER IF EXISTS trigger_generate_very_short_order_code ON orders;
DROP TRIGGER IF EXISTS generate_order_code_trigger ON orders;

-- 2. Drop all existing order code generation functions
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

-- 5. Also fix quotation code generation if needed
DROP TRIGGER IF EXISTS generate_quotation_code_trigger ON quotations;
DROP FUNCTION IF EXISTS generate_quotation_code();

CREATE OR REPLACE FUNCTION generate_quotation_code()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_next_number INTEGER;
    v_quotation_code TEXT;
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_code FROM 'QC-' || v_year || '-(.*)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM quotations
    WHERE quotation_code LIKE 'QC-' || v_year || '-%';
    
    -- Generate quotation code using simple string padding
    v_quotation_code := 'QC-' || v_year || '-' || 
                       CASE 
                           WHEN v_next_number < 10 THEN '000' || v_next_number::TEXT
                           WHEN v_next_number < 100 THEN '00' || v_next_number::TEXT
                           WHEN v_next_number < 1000 THEN '0' || v_next_number::TEXT
                           ELSE v_next_number::TEXT
                       END;
    
    NEW.quotation_code := v_quotation_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the quotation code trigger
CREATE TRIGGER generate_quotation_code_trigger
    BEFORE INSERT ON quotations
    FOR EACH ROW
    WHEN (NEW.quotation_code IS NULL)
    EXECUTE FUNCTION generate_quotation_code();

-- 6. Also fix merchant code generation if needed
DROP TRIGGER IF EXISTS generate_merchant_code_trigger ON merchants;
DROP FUNCTION IF EXISTS generate_merchant_code();

CREATE OR REPLACE FUNCTION generate_merchant_code()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_next_number INTEGER;
    v_merchant_code TEXT;
BEGIN
    -- Get current year
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(merchant_code FROM 'MC-' || v_year || '-(.*)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM merchants
    WHERE merchant_code LIKE 'MC-' || v_year || '-%';
    
    -- Generate merchant code using simple string padding
    v_merchant_code := 'MC-' || v_year || '-' || 
                      CASE 
                          WHEN v_next_number < 10 THEN '000' || v_next_number::TEXT
                          WHEN v_next_number < 100 THEN '00' || v_next_number::TEXT
                          WHEN v_next_number < 1000 THEN '0' || v_next_number::TEXT
                          ELSE v_next_number::TEXT
                      END;
    
    NEW.merchant_code := v_merchant_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the merchant code trigger
CREATE TRIGGER generate_merchant_code_trigger
    BEFORE INSERT ON merchants
    FOR EACH ROW
    WHEN (NEW.merchant_code IS NULL)
    EXECUTE FUNCTION generate_merchant_code();

-- 7. Test the functions
SELECT 'Testing order code generation...' as message;
SELECT generate_order_code() as test_result;