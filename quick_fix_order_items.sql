-- QUICK FIX FOR ORDER ITEMS DISPLAY ISSUE
-- This script specifically fixes the "No items found for this order" problem

-- 1. Check current state
SELECT 
    'Current State' as check_type,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM order_items) as total_order_items,
    (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items;

-- 2. Check specific order ORD-2025-0005
SELECT 
    o.id,
    o.order_code,
    o.merchant_code,
    o.cart_items,
    COUNT(oi.id) as order_items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code, o.cart_items;

-- 3. Populate order_items for ORD-2025-0005 if missing
INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    price,
    unit_price,
    subtotal,
    merchant_code,
    created_at
)
SELECT 
    o.id as order_id,
    NULL as product_id, -- We'll update this later
    COALESCE((item->>'quantity')::integer, 1) as quantity,
    COALESCE((item->>'price')::numeric, 0) as price,
    COALESCE((item->>'unit_price')::numeric, (item->>'price')::numeric / GREATEST((item->>'quantity')::integer, 1)) as unit_price,
    COALESCE((item->>'price')::numeric, 0) as subtotal,
    o.merchant_code,
    NOW() as created_at
FROM orders o
CROSS JOIN jsonb_array_elements(o.cart_items) AS item
WHERE o.order_code = 'ORD-2025-0005'
    AND NOT EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = o.id
    );

-- 4. Try to match products by name for the created order_items
UPDATE order_items oi
SET product_id = p.id
FROM products p
JOIN orders o ON oi.order_id = o.id
WHERE o.order_code = 'ORD-2025-0005'
    AND oi.product_id IS NULL
    AND p.name ILIKE '%bamboo%'; -- Adjust this based on the actual product names

-- 5. Verify the fix
SELECT 
    o.order_code,
    o.merchant_code,
    oi.id as order_item_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    p.name as product_name
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code = 'ORD-2025-0005';

-- 6. Create a simple function to populate order_items for any order
CREATE OR REPLACE FUNCTION populate_order_items_for_order(p_order_code TEXT)
RETURNS JSONB AS $$
DECLARE
    order_record RECORD;
    cart_item JSONB;
    order_item_id UUID;
    result JSONB := '{"processed": 0, "errors": 0}'::jsonb;
BEGIN
    -- Get the order
    SELECT * INTO order_record 
    FROM orders 
    WHERE order_code = p_order_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found: ' || p_order_code
        );
    END IF;
    
    -- Check if order_items already exist
    IF EXISTS (SELECT 1 FROM order_items WHERE order_id = order_record.id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order items already exist for this order'
        );
    END IF;
    
    -- Parse cart_items and create order_items
    FOR cart_item IN SELECT * FROM jsonb_array_elements(order_record.cart_items)
    LOOP
        -- Try to find product by name
        DECLARE
            product_id UUID;
        BEGIN
            SELECT id INTO product_id 
            FROM products 
            WHERE name ILIKE '%' || (cart_item->>'name') || '%'
            LIMIT 1;
            
            -- Insert order_item
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                price,
                unit_price,
                subtotal,
                merchant_code,
                created_at
            ) VALUES (
                order_record.id,
                product_id,
                COALESCE((cart_item->>'quantity')::integer, 1),
                COALESCE((cart_item->>'price')::numeric, 0),
                COALESCE((cart_item->>'unit_price')::numeric, (cart_item->>'price')::numeric / GREATEST((cart_item->>'quantity')::integer, 1)),
                COALESCE((cart_item->>'price')::numeric, 0),
                order_record.merchant_code,
                NOW()
            );
            
            result := jsonb_set(result, '{processed}', to_jsonb((result->>'processed')::integer + 1));
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(result, '{errors}', to_jsonb((result->>'errors')::integer + 1));
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order items created successfully',
        'processed', result->>'processed',
        'errors', result->>'errors'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Test the function
SELECT populate_order_items_for_order('ORD-2025-0005');

-- 8. Final verification
SELECT 
    'Final Verification' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    array_agg(oi.quantity || 'x ₹' || oi.unit_price) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code;