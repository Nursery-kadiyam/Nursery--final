-- Fix Order Items Display Issue
-- This script ensures that order items are properly populated and displayed

-- 1. First, let's check if there are orders without corresponding order_items
SELECT 
    o.id as order_id,
    o.order_code,
    o.cart_items IS NOT NULL as has_cart_items,
    o.cart_items,
    COUNT(oi.id) as order_items_count,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.cart_items IS NOT NULL 
    AND o.cart_items != '[]'::jsonb
    AND o.cart_items != 'null'::jsonb
GROUP BY o.id, o.order_code, o.cart_items, o.created_at
HAVING COUNT(oi.id) = 0
ORDER BY o.created_at DESC
LIMIT 10;

-- 2. Create a function to populate order_items from cart_items for existing orders
CREATE OR REPLACE FUNCTION populate_order_items_from_cart()
RETURNS jsonb AS $$
DECLARE
    order_record RECORD;
    cart_item JSONB;
    order_item_id UUID;
    product_id UUID;
    result JSONB := '{"processed": 0, "errors": 0, "details": []}'::jsonb;
BEGIN
    -- Loop through orders that have cart_items but no order_items
    FOR order_record IN 
        SELECT 
            o.id as order_id,
            o.order_code,
            o.cart_items,
            o.merchant_code,
            o.quotation_code
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.cart_items IS NOT NULL 
            AND o.cart_items != '[]'::jsonb
            AND o.cart_items != 'null'::jsonb
            AND o.cart_items != '{}'::jsonb
        GROUP BY o.id, o.order_code, o.cart_items, o.merchant_code, o.quotation_code
        HAVING COUNT(oi.id) = 0
    LOOP
        BEGIN
            -- Parse cart_items and create order_items
            FOR cart_item IN SELECT * FROM jsonb_array_elements(order_record.cart_items)
            LOOP
                -- Try to find product by name if product_id is not available
                IF cart_item->>'product_id' IS NOT NULL THEN
                    product_id := (cart_item->>'product_id')::uuid;
                ELSE
                    -- Try to find product by name
                    SELECT id INTO product_id 
                    FROM products 
                    WHERE name ILIKE '%' || (cart_item->>'name') || '%'
                    LIMIT 1;
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
                    COALESCE((cart_item->>'quantity')::integer, 1),
                    COALESCE((cart_item->>'price')::numeric, 0),
                    COALESCE((cart_item->>'unit_price')::numeric, (cart_item->>'price')::numeric / GREATEST((cart_item->>'quantity')::integer, 1)),
                    COALESCE((cart_item->>'subtotal')::numeric, (cart_item->>'price')::numeric * (cart_item->>'quantity')::integer),
                    order_record.merchant_code,
                    order_record.quotation_code,
                    NOW()
                );
                
                result := jsonb_set(result, '{processed}', to_jsonb((result->>'processed')::integer + 1));
            END LOOP;
            
            result := jsonb_set(result, '{details}', 
                (result->'details') || jsonb_build_object(
                    'order_id', order_record.order_id,
                    'order_code', order_record.order_code,
                    'status', 'success'
                )
            );
            
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(result, '{errors}', to_jsonb((result->>'errors')::integer + 1));
            result := jsonb_set(result, '{details}', 
                (result->'details') || jsonb_build_object(
                    'order_id', order_record.order_id,
                    'order_code', order_record.order_code,
                    'status', 'error',
                    'error', SQLERRM
                )
            );
        END;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Run the function to populate missing order_items
SELECT populate_order_items_from_cart();

-- 4. Verify the results
SELECT 
    'Orders with cart_items' as category,
    COUNT(*) as count
FROM orders 
WHERE cart_items IS NOT NULL 
    AND cart_items != '[]'::jsonb
    AND cart_items != 'null'::jsonb

UNION ALL

SELECT 
    'Orders with order_items' as category,
    COUNT(DISTINCT order_id) as count
FROM order_items

UNION ALL

SELECT 
    'Order items total' as category,
    COUNT(*) as count
FROM order_items;

-- 5. Check specific orders that should have items
SELECT 
    o.id as order_id,
    o.order_code,
    o.merchant_code,
    o.cart_items IS NOT NULL as has_cart_items,
    COUNT(oi.id) as order_items_count,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_code LIKE '%2025%'
GROUP BY o.id, o.order_code, o.merchant_code, o.cart_items, o.created_at
ORDER BY o.created_at DESC
LIMIT 20;

-- 6. Check order_items for recent orders
SELECT 
    oi.id,
    oi.order_id,
    o.order_code,
    oi.quantity,
    oi.price,
    oi.unit_price,
    oi.subtotal,
    p.name as product_name,
    oi.created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code LIKE '%2025%'
ORDER BY oi.created_at DESC
LIMIT 20;

-- 7. Update order_items with proper unit_price if missing
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 THEN price / quantity 
    ELSE 0 
END
WHERE unit_price IS NULL OR unit_price = 0;

-- 8. Update order_items with proper subtotal if missing
UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE subtotal IS NULL OR subtotal = 0;

-- 9. Ensure RLS policies allow reading order_items
-- Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'order_items';

-- 10. Create comprehensive order view for debugging
CREATE OR REPLACE VIEW order_items_debug AS
SELECT 
    o.id as order_id,
    o.order_code,
    o.merchant_code,
    o.cart_items IS NOT NULL as has_cart_items,
    jsonb_array_length(o.cart_items) as cart_items_count,
    COUNT(oi.id) as order_items_count,
    o.created_at,
    o.status
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.merchant_code, o.cart_items, o.created_at, o.status
ORDER BY o.created_at DESC;

-- Query the debug view
SELECT * FROM order_items_debug 
WHERE order_code LIKE '%2025%' 
LIMIT 10;