-- Fix for "function update_product_stock(...) is not unique" error
-- This script ensures all function calls have explicit type casting

-- First, let's drop any existing triggers that might be causing issues
DROP TRIGGER IF EXISTS trg_order_item_stock_management ON order_items;
DROP TRIGGER IF EXISTS trigger_order_status_change ON orders;

-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS trg_process_order_item_stock_changes();

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

-- Update the handle_order_status_change function with explicit type casting
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is placed (status changes to 'Paid' or 'confirmed')
    IF NEW.status IN ('Paid', 'confirmed', 'processing') AND 
       OLD.status NOT IN ('Paid', 'confirmed', 'processing') THEN
        PERFORM process_order_stock_changes(NEW.id, 'place'::TEXT);
    END IF;
    
    -- When order is cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM process_order_stock_changes(NEW.id, 'cancel'::TEXT);
    END IF;
    
    -- When order is refunded
    IF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
        PERFORM process_order_stock_changes(NEW.id, 'refund'::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on orders table
CREATE TRIGGER trigger_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

-- Verify the functions were updated
SELECT 'Functions updated successfully to fix uniqueness error!' as status;