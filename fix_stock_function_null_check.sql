-- Fix update_product_stock function to handle NULL product_id
-- This prevents stock update errors for quotation-based orders

CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_transaction_type TEXT,
    p_order_id UUID DEFAULT NULL,
    p_quotation_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
    transaction_id UUID;
BEGIN
    -- Skip stock update for quotation-based orders (product_id is null)
    IF p_product_id IS NULL THEN
        RAISE NOTICE 'Skipping stock update for quotation-based order item (product_id is null)';
        RETURN TRUE;
    END IF;
    
    -- Get current stock
    SELECT available_quantity INTO current_stock
    FROM products
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    -- Calculate new stock
    new_stock := current_stock + p_quantity_change;
    
    -- Prevent negative stock (except for damaged/expired transactions)
    IF new_stock < 0 AND p_transaction_type NOT IN ('damaged', 'expired', 'adjustment') THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested change: %, New stock would be: %', 
            current_stock, p_quantity_change, new_stock;
    END IF;
    
    -- Update product stock
    UPDATE products 
    SET available_quantity = new_stock
    WHERE id = p_product_id;
    
    -- Record the transaction
    INSERT INTO stock_transactions (
        product_id,
        order_id,
        quotation_id,
        transaction_type,
        quantity,
        previous_quantity,
        new_quantity,
        reason,
        created_by,
        notes
    ) VALUES (
        p_product_id,
        p_order_id,
        p_quotation_id,
        p_transaction_type,
        p_quantity_change,
        current_stock,
        new_stock,
        p_reason,
        auth.uid(),
        p_notes
    ) RETURNING id INTO transaction_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Stock update failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
SELECT 'update_product_stock function updated successfully!' as status;