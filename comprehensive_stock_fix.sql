-- Comprehensive fix to remove all stock management dependencies
-- This will fix the order placement error by removing references to stock_transactions

-- 1. Drop all problematic triggers
DROP TRIGGER IF EXISTS trigger_order_item_changes ON order_items;
DROP TRIGGER IF EXISTS trigger_order_placement ON orders;
DROP TRIGGER IF EXISTS trigger_order_cancellation ON orders;

-- 2. Drop all stock management functions
DROP FUNCTION IF EXISTS handle_order_item_changes();
DROP FUNCTION IF EXISTS handle_order_placement();
DROP FUNCTION IF EXISTS handle_order_cancellation();
DROP FUNCTION IF EXISTS adjust_product_stock(uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS restock_product(uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS update_product_stock(uuid, integer, text, uuid, text, uuid);
DROP FUNCTION IF EXISTS simple_stock_update(uuid, integer);

-- 3. Create simplified replacement functions

-- Simple order items handler (no stock management)
CREATE OR REPLACE FUNCTION handle_order_item_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Just update the subtotal when quantity or price changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.subtotal = NEW.quantity * COALESCE(NEW.unit_price, 0);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Simple order placement handler (no stock management)
CREATE OR REPLACE FUNCTION handle_order_placement()
RETURNS TRIGGER AS $$
BEGIN
    -- Just log the order placement, no stock management
    RAISE NOTICE 'Order placed: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Simple order cancellation handler (no stock management)
CREATE OR REPLACE FUNCTION handle_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Just log the order cancellation, no stock management
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        RAISE NOTICE 'Order cancelled: %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the triggers with simplified functions
CREATE TRIGGER trigger_order_item_changes
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_item_changes();

CREATE TRIGGER trigger_order_placement
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_placement();

CREATE TRIGGER trigger_order_cancellation
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_cancellation();

-- 5. Update the place_order function to remove stock management
CREATE OR REPLACE FUNCTION place_order(
    p_user_id uuid,
    p_delivery_address jsonb,
    p_cart_items jsonb,
    p_total_amount numeric,
    p_quotation_code text DEFAULT NULL,
    p_merchant_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_result jsonb;
    v_cart_item jsonb;
    v_item_id uuid;
    v_quantity integer;
    v_price numeric;
    v_unit_price numeric;
BEGIN
    -- Insert the main order
    INSERT INTO orders (
        user_id,
        delivery_address,
        cart_items,
        total_amount,
        quotation_code,
        merchant_code,
        status
    ) VALUES (
        p_user_id,
        p_delivery_address,
        p_cart_items,
        p_total_amount,
        p_quotation_code,
        COALESCE(p_merchant_code, 'admin'),
        'pending'
    ) RETURNING id INTO v_order_id;
    
    -- Insert order items from cart_items
    FOR v_cart_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_item_id := (v_cart_item->>'id')::uuid;
        v_quantity := (v_cart_item->>'quantity')::integer;
        v_price := (v_cart_item->>'price')::numeric;
        v_unit_price := (v_cart_item->>'unit_price')::numeric;
        
        -- Insert order item
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            unit_price,
            subtotal,
            merchant_code
        ) VALUES (
            v_order_id,
            v_item_id,
            v_quantity,
            v_price,
            COALESCE(v_unit_price, v_price / v_quantity),
            v_quantity * COALESCE(v_unit_price, v_price / v_quantity),
            COALESCE(p_merchant_code, 'admin')
        );
    END LOOP;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order placed successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to place order'
        );
        RETURN v_result;
END;
$$;

-- 6. Verify the changes
SELECT 
    'Functions' as type,
    routine_name as name,
    routine_type as category
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%stock%'
UNION ALL
SELECT 
    'Triggers' as type,
    trigger_name as name,
    event_manipulation as category
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%stock%'
ORDER BY type, name;