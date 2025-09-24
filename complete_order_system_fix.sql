-- COMPLETE ORDER SYSTEM FIX
-- This script fixes the entire order flow for multi-merchant orders

-- 1. First, let's check the current state of orders and order_items
SELECT 
    'Current State Analysis' as check_type,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM order_items) as total_order_items,
    (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items,
    (SELECT COUNT(*) FROM orders WHERE cart_items IS NOT NULL AND cart_items != '[]'::jsonb) as orders_with_cart_items;

-- 2. Check for orders that should have order_items but don't
SELECT 
    o.id as order_id,
    o.order_code,
    o.merchant_code,
    o.cart_items IS NOT NULL as has_cart_items,
    COUNT(oi.id) as order_items_count,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.cart_items IS NOT NULL 
    AND o.cart_items != '[]'::jsonb
    AND o.cart_items != 'null'::jsonb
    AND o.cart_items != '{}'::jsonb
GROUP BY o.id, o.order_code, o.merchant_code, o.cart_items, o.created_at
HAVING COUNT(oi.id) = 0
ORDER BY o.created_at DESC
LIMIT 10;

-- 3. Create a comprehensive function to populate order_items from cart_items
CREATE OR REPLACE FUNCTION populate_all_order_items()
RETURNS JSONB AS $$
DECLARE
    order_record RECORD;
    cart_item JSONB;
    order_item_id UUID;
    product_id UUID;
    result JSONB := '{"processed": 0, "errors": 0, "details": []}'::jsonb;
    merchant_code TEXT;
BEGIN
    -- Loop through orders that have cart_items but no order_items
    FOR order_record IN 
        SELECT 
            o.id as order_id,
            o.order_code,
            o.cart_items,
            o.merchant_code,
            o.quotation_code,
            o.user_id
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.cart_items IS NOT NULL 
            AND o.cart_items != '[]'::jsonb
            AND o.cart_items != 'null'::jsonb
            AND o.cart_items != '{}'::jsonb
            AND o.cart_items::text != '"order_items"'
            AND o.cart_items::text != 'order_items'
        GROUP BY o.id, o.order_code, o.cart_items, o.merchant_code, o.quotation_code, o.user_id
        HAVING COUNT(oi.id) = 0
    LOOP
        BEGIN
            merchant_code := order_record.merchant_code;
            
            -- Parse cart_items and create order_items
            FOR cart_item IN SELECT * FROM jsonb_array_elements(order_record.cart_items)
            LOOP
                -- Skip if cart_item is not a valid object
                IF jsonb_typeof(cart_item) != 'object' THEN
                    CONTINUE;
                END IF;
                
                -- Try to find product by ID first, then by name
                IF cart_item->>'id' IS NOT NULL AND cart_item->>'id' != '' THEN
                    BEGIN
                        product_id := (cart_item->>'id')::uuid;
                    EXCEPTION WHEN OTHERS THEN
                        product_id := NULL;
                    END;
                END IF;
                
                -- If product_id not found by ID, try by name
                IF product_id IS NULL AND cart_item->>'name' IS NOT NULL THEN
                    SELECT id INTO product_id 
                    FROM products 
                    WHERE name ILIKE '%' || (cart_item->>'name') || '%'
                    LIMIT 1;
                END IF;
                
                -- Calculate prices
                DECLARE
                    quantity INTEGER := COALESCE((cart_item->>'quantity')::integer, 1);
                    unit_price NUMERIC := 0;
                    total_price NUMERIC := 0;
                BEGIN
                    -- Try to get unit_price from cart_item
                    IF cart_item->>'unit_price' IS NOT NULL THEN
                        unit_price := (cart_item->>'unit_price')::numeric;
                    ELSIF cart_item->>'price' IS NOT NULL AND quantity > 0 THEN
                        unit_price := (cart_item->>'price')::numeric / quantity;
                    END IF;
                    
                    -- Calculate total_price
                    IF cart_item->>'price' IS NOT NULL THEN
                        total_price := (cart_item->>'price')::numeric;
                    ELSE
                        total_price := unit_price * quantity;
                    END IF;
                    
                    -- Insert order_item
                    INSERT INTO order_items (
                        order_id,
                        product_id,
                        quantity,
                        price,
                        unit_price,
                        subtotal,
                        merchant_code,
                        quotation_id,
                        created_at
                    ) VALUES (
                        order_record.order_id,
                        product_id,
                        quantity,
                        total_price,
                        unit_price,
                        total_price,
                        merchant_code,
                        order_record.quotation_code,
                        NOW()
                    );
                    
                    result := jsonb_set(result, '{processed}', to_jsonb((result->>'processed')::integer + 1));
                END;
            END LOOP;
            
            result := jsonb_set(result, '{details}', 
                (result->'details') || jsonb_build_object(
                    'order_id', order_record.order_id,
                    'order_code', order_record.order_code,
                    'merchant_code', merchant_code,
                    'status', 'success'
                )
            );
            
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(result, '{errors}', to_jsonb((result->>'errors')::integer + 1));
            result := jsonb_set(result, '{details}', 
                (result->'details') || jsonb_build_object(
                    'order_id', order_record.order_id,
                    'order_code', order_record.order_code,
                    'merchant_code', merchant_code,
                    'status', 'error',
                    'error', SQLERRM
                )
            );
        END;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Run the population function
SELECT populate_all_order_items();

-- 5. Update order_items with proper unit_price and subtotal if missing
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 AND unit_price IS NULL THEN price / quantity 
    WHEN unit_price = 0 AND quantity > 0 THEN price / quantity
    ELSE unit_price 
END
WHERE (unit_price IS NULL OR unit_price = 0) AND quantity > 0;

UPDATE order_items 
SET subtotal = CASE 
    WHEN subtotal IS NULL OR subtotal = 0 THEN quantity * unit_price
    ELSE subtotal 
END
WHERE (subtotal IS NULL OR subtotal = 0);

-- 6. Create a function to get merchant orders with items
CREATE OR REPLACE FUNCTION get_merchant_orders_with_items(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    delivery_address JSONB,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        COALESCE(
            (up.first_name || ' ' || up.last_name),
            'Customer'
        ) as customer_name,
        COALESCE(up.email, 'No email') as customer_email,
        COALESCE(up.phone, 'No phone') as customer_phone,
        o.total_amount,
        o.status,
        o.created_at,
        o.delivery_address,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
                    'image', p.image_url
                )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    LEFT JOIN user_profiles up ON o.user_id = up.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.merchant_code = p_merchant_code
    GROUP BY o.id, o.order_code, up.first_name, up.last_name, up.email, up.phone, 
             o.total_amount, o.status, o.created_at, o.delivery_address
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to get user orders with items
CREATE OR REPLACE FUNCTION get_user_orders_with_items(p_user_id UUID)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    merchant_code TEXT,
    merchant_name TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    delivery_address JSONB,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.merchant_code,
        COALESCE(m.nursery_name, 'Admin Store') as merchant_name,
        o.total_amount,
        o.status,
        o.created_at,
        o.delivery_address,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
                    'image', p.image_url
                )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    LEFT JOIN merchants m ON o.merchant_code = m.merchant_code
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = p_user_id
    GROUP BY o.id, o.order_code, o.merchant_code, m.nursery_name, 
             o.total_amount, o.status, o.created_at, o.delivery_address
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ensure proper RLS policies for order_items
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can view order items for their orders" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (
                orders.merchant_code IN (
                    SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
                )
                OR
                orders.merchant_id IN (
                    SELECT id FROM merchants WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_orders_with_items TO authenticated;

-- 10. Create a comprehensive order view for debugging
CREATE OR REPLACE VIEW order_system_debug AS
SELECT 
    o.id as order_id,
    o.order_code,
    o.merchant_code,
    o.user_id,
    o.total_amount,
    o.status,
    o.cart_items IS NOT NULL as has_cart_items,
    jsonb_array_length(o.cart_items) as cart_items_count,
    COUNT(oi.id) as order_items_count,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.merchant_code, o.user_id, o.total_amount, o.status, o.cart_items, o.created_at
ORDER BY o.created_at DESC;

-- 11. Final verification
SELECT 
    'Final Status Check' as check_type,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM order_items) as total_order_items,
    (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items,
    (SELECT COUNT(*) FROM orders WHERE cart_items IS NOT NULL AND cart_items != '[]'::jsonb) as orders_with_cart_items,
    (SELECT COUNT(*) FROM orders WHERE merchant_code IS NOT NULL) as orders_with_merchant_code;

-- 12. Test the new functions
SELECT 'Testing get_merchant_orders_with_items function' as test_name;
-- This will show merchant orders with their items
-- SELECT * FROM get_merchant_orders_with_items('YOUR_MERCHANT_CODE');

SELECT 'Testing get_user_orders_with_items function' as test_name;
-- This will show user orders with their items
-- SELECT * FROM get_user_orders_with_items('USER_ID');

-- 13. Show sample results
SELECT 
    'Sample Orders with Items' as section,
    o.order_code,
    o.merchant_code,
    o.total_amount,
    COUNT(oi.id) as item_count,
    array_agg(p.name) as product_names
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_code, o.merchant_code, o.total_amount
ORDER BY o.created_at DESC
LIMIT 10;