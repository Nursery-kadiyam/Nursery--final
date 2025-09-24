-- FIX ORDER ITEMS POPULATION FOR ORD-2025-0005
-- This script specifically fixes the order items for the problematic order

-- 1. Check the current state of ORD-2025-0005
SELECT 
    'Current State Check' as check_type,
    o.id,
    o.order_code,
    o.merchant_code,
    o.cart_items IS NOT NULL as has_cart_items,
    jsonb_array_length(o.cart_items) as cart_items_count,
    COUNT(oi.id) as order_items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code, o.cart_items;

-- 2. Show the cart_items content
SELECT 
    'Cart Items Content' as check_type,
    o.order_code,
    o.cart_items
FROM orders o
WHERE o.order_code = 'ORD-2025-0005';

-- 3. Delete existing order_items for this order (if any)
DELETE FROM order_items 
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

-- 4. Insert order_items from cart_items
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
)
SELECT 
    o.id as order_id,
    -- Try to find product by name
    (SELECT id FROM products WHERE name ILIKE '%' || (item->>'name') || '%' LIMIT 1) as product_id,
    COALESCE((item->>'quantity')::integer, 1) as quantity,
    COALESCE((item->>'price')::numeric, 0) as price,
    COALESCE((item->>'unit_price')::numeric, 
              CASE 
                  WHEN (item->>'quantity')::integer > 0 
                  THEN (item->>'price')::numeric / (item->>'quantity')::integer 
                  ELSE 0 
              END) as unit_price,
    COALESCE((item->>'price')::numeric, 0) as subtotal,
    o.merchant_code,
    o.quotation_code,
    NOW() as created_at
FROM orders o
CROSS JOIN jsonb_array_elements(o.cart_items) AS item
WHERE o.order_code = 'ORD-2025-0005'
    AND o.cart_items IS NOT NULL
    AND o.cart_items != '[]'::jsonb
    AND o.cart_items != 'null'::jsonb;

-- 5. Update unit_price if it's still 0
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 AND unit_price = 0 THEN price / quantity 
    ELSE unit_price 
END
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

-- 6. Update subtotal if it's 0
UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
)
AND subtotal = 0;

-- 7. Verify the fix
SELECT 
    'After Fix Verification' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    array_agg(
        jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'product_name', p.name
        )
    ) as order_items_details
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code;

-- 8. Test the merchant access function
SELECT 
    'Merchant Access Test' as check_type,
    *
FROM get_merchant_orders_with_items('MC-2025-TXYR')
WHERE order_code = 'ORD-2025-0005';

-- 9. Create a comprehensive order items population function for all orders
CREATE OR REPLACE FUNCTION populate_all_missing_order_items()
RETURNS JSONB AS $$
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
            AND o.cart_items::text != '"order_items"'
            AND o.cart_items::text != 'order_items'
        GROUP BY o.id, o.order_code, o.cart_items, o.merchant_code, o.quotation_code
        HAVING COUNT(oi.id) = 0
    LOOP
        BEGIN
            -- Delete any existing order_items for this order first
            DELETE FROM order_items WHERE order_id = order_record.order_id;
            
            -- Parse cart_items and create order_items
            FOR cart_item IN SELECT * FROM jsonb_array_elements(order_record.cart_items)
            LOOP
                -- Skip if cart_item is not a valid object
                IF jsonb_typeof(cart_item) != 'object' THEN
                    CONTINUE;
                END IF;
                
                -- Try to find product by name
                SELECT id INTO product_id 
                FROM products 
                WHERE name ILIKE '%' || (cart_item->>'name') || '%'
                LIMIT 1;
                
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
                        order_record.merchant_code,
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
                    'merchant_code', order_record.merchant_code,
                    'status', 'success'
                )
            );
            
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(result, '{errors}', to_jsonb((result->>'errors')::integer + 1));
            result := jsonb_set(result, '{details}', 
                (result->'details') || jsonb_build_object(
                    'order_id', order_record.order_id,
                    'order_code', order_record.order_code,
                    'merchant_code', order_record.merchant_code,
                    'status', 'error',
                    'error', SQLERRM
                )
            );
        END;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Run the comprehensive population function
SELECT populate_all_missing_order_items();

-- 11. Final verification
SELECT 
    'Final Status Check' as check_type,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM order_items) as total_order_items,
    (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items,
    (SELECT COUNT(*) FROM orders WHERE cart_items IS NOT NULL AND cart_items != '[]'::jsonb) as orders_with_cart_items;