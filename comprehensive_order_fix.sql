-- Comprehensive fix for order creation and LPAD function error
-- This script fixes the database triggers and ensures order creation works

-- 1. Drop all existing problematic triggers
DROP TRIGGER IF EXISTS generate_order_code_trigger ON orders;
DROP TRIGGER IF EXISTS generate_quotation_code_trigger ON quotations;
DROP TRIGGER IF EXISTS generate_merchant_code_trigger ON merchants;

-- 2. Create a simple order code generation function without LPAD
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

-- 3. Create the order code trigger
CREATE TRIGGER generate_order_code_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_code IS NULL)
    EXECUTE FUNCTION generate_order_code();

-- 4. Create quotation code generation function
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

-- 5. Create the quotation code trigger
CREATE TRIGGER generate_quotation_code_trigger
    BEFORE INSERT ON quotations
    FOR EACH ROW
    WHEN (NEW.quotation_code IS NULL)
    EXECUTE FUNCTION generate_quotation_code();

-- 6. Create merchant code generation function
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

-- 7. Create the merchant code trigger
CREATE TRIGGER generate_merchant_code_trigger
    BEFORE INSERT ON merchants
    FOR EACH ROW
    WHEN (NEW.merchant_code IS NULL)
    EXECUTE FUNCTION generate_merchant_code();

-- 8. Ensure the orders table has all required columns for parent-child orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS parent_order_id uuid,
ADD COLUMN IF NOT EXISTS merchant_id uuid,
ADD COLUMN IF NOT EXISTS merchant_code text,
ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);

-- 9. Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for parent_order_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_parent_order_id_fkey'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_parent_order_id_fkey 
        FOREIGN KEY (parent_order_id) REFERENCES orders(id);
    END IF;
    
    -- Add foreign key for merchant_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_merchant_id_fkey'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_merchant_id_fkey 
        FOREIGN KEY (merchant_id) REFERENCES merchants(id);
    END IF;
END $$;

-- 10. Test the order code generation
SELECT 'Testing order code generation...' as test_message;
SELECT generate_order_code() as test_function_result;