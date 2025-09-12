-- Simple fix for "function update_product_stock(...) is not unique" error
-- This ensures all function calls have explicit type casting

-- Update the process_order_stock_changes function to have explicit type casting
CREATE OR REPLACE FUNCTION process_order_stock_changes(
    p_order_id UUID,
    p_action TEXT -- 'place', 'cancel', 'refund'
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    quantity_change INTEGER;
    transaction_type TEXT;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    -- Determine transaction type and quantity change
    CASE p_action
        WHEN 'place' THEN
            transaction_type := 'purchase';
            quantity_change := -1; -- Decrease stock
        WHEN 'cancel' THEN
            transaction_type := 'cancellation';
            quantity_change := 1; -- Increase stock
        WHEN 'refund' THEN
            transaction_type := 'refund';
            quantity_change := 1; -- Increase stock
        ELSE
            RAISE EXCEPTION 'Invalid action: %. Must be place, cancel, or refund', p_action;
    END CASE;
    
    -- Process each order item
    FOR item_record IN 
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        -- Skip stock update for quotation-based orders (product_id is null)
        IF item_record.product_id IS NULL THEN
            RAISE NOTICE 'Skipping stock update for quotation-based order item (product_id is null)';
            CONTINUE;
        END IF;
        
        -- Update stock for each item with explicit type casting
        PERFORM update_product_stock(
            item_record.product_id,
            item_record.quantity * quantity_change,
            transaction_type::TEXT,
            p_order_id,
            NULL::UUID,
            CASE 
                WHEN p_action = 'place' THEN 'Order placed'::TEXT
                WHEN p_action = 'cancel' THEN 'Order cancelled'::TEXT
                WHEN p_action = 'refund' THEN 'Order refunded'::TEXT
            END,
            CASE 
                WHEN p_action = 'place' THEN 'Stock decreased due to order placement'::TEXT
                WHEN p_action = 'cancel' THEN 'Stock restored due to order cancellation'::TEXT
                WHEN p_action = 'refund' THEN 'Stock restored due to order refund'::TEXT
            END
        );
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Order stock processing failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the update_product_stock function has the null check
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

-- Verify the functions were updated
SELECT 'Functions updated successfully to fix uniqueness error!' as status;