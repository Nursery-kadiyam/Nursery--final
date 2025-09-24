-- Fix Order Items RLS Policies and JSON Parsing Issues
-- This script addresses both the RLS policy issues and JSON parsing errors

-- 1. First, let's check the current RLS policies for order_items
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

-- 2. Check for problematic cart_items data
SELECT 
    id,
    order_code,
    cart_items,
    CASE 
        WHEN cart_items IS NULL THEN 'NULL'
        WHEN cart_items = 'null'::jsonb THEN 'null string'
        WHEN cart_items = '[]'::jsonb THEN 'empty array'
        WHEN cart_items = '{}'::jsonb THEN 'empty object'
        WHEN cart_items::text = '"order_items"' THEN 'INVALID: string "order_items"'
        WHEN cart_items::text = 'order_items' THEN 'INVALID: unquoted string'
        ELSE 'valid JSON'
    END as cart_items_status,
    created_at
FROM orders 
WHERE cart_items IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Fix problematic cart_items data
UPDATE orders 
SET cart_items = '[]'::jsonb
WHERE cart_items::text = '"order_items"' 
   OR cart_items::text = 'order_items'
   OR cart_items IS NULL;

-- 4. Drop existing order_items policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- 5. Create comprehensive RLS policies for order_items
-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own order items
CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Policy 2: Users can insert order items for their orders
CREATE POLICY "Users can insert order items for their orders" ON order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Policy 3: Merchants can view order items for their orders
CREATE POLICY "Merchants can view order items for their orders" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (
                -- Direct merchant assignment
                orders.merchant_id IN (
                    SELECT id FROM merchants WHERE user_id = auth.uid()
                )
                OR
                -- Merchant code assignment
                orders.merchant_code IN (
                    SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
                )
                OR
                -- Child order merchant assignment (parent-child relationship)
                EXISTS (
                    SELECT 1 FROM orders parent_order
                    WHERE parent_order.id = orders.parent_order_id
                    AND (
                        parent_order.merchant_id IN (
                            SELECT id FROM merchants WHERE user_id = auth.uid()
                        )
                        OR
                        parent_order.merchant_code IN (
                            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

-- Policy 4: Admins can manage all order items
CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Policy 5: System can insert order items (for order creation functions)
CREATE POLICY "System can insert order items" ON order_items
    FOR INSERT
    WITH CHECK (true);

-- 6. Create a function to get order items with proper merchant access
CREATE OR REPLACE FUNCTION get_order_items_for_merchant(p_merchant_code TEXT)
RETURNS TABLE (
    order_item_id UUID,
    order_id UUID,
    order_code TEXT,
    product_name TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    subtotal NUMERIC,
    product_image TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id as order_item_id,
        oi.order_id,
        o.order_code,
        p.name as product_name,
        oi.quantity,
        oi.unit_price,
        oi.subtotal,
        p.image_url as product_image
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE 
        -- Merchant access check
        (
            o.merchant_code = p_merchant_code
            OR 
            o.merchant_id IN (
                SELECT id FROM merchants WHERE merchant_code = p_merchant_code
            )
            OR
            -- For child orders, check parent order merchant
            EXISTS (
                SELECT 1 FROM orders parent_order
                WHERE parent_order.id = o.parent_order_id
                AND (
                    parent_order.merchant_code = p_merchant_code
                    OR
                    parent_order.merchant_id IN (
                        SELECT id FROM merchants WHERE merchant_code = p_merchant_code
                    )
                )
            )
        )
        AND oi.order_id IS NOT NULL
    ORDER BY o.created_at DESC, oi.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to get order items for users
CREATE OR REPLACE FUNCTION get_order_items_for_user(p_user_id UUID)
RETURNS TABLE (
    order_item_id UUID,
    order_id UUID,
    order_code TEXT,
    product_name TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    subtotal NUMERIC,
    product_image TEXT,
    merchant_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id as order_item_id,
        oi.order_id,
        o.order_code,
        p.name as product_name,
        oi.quantity,
        oi.unit_price,
        oi.subtotal,
        p.image_url as product_image,
        o.merchant_code
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC, oi.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verify the policies are working
SELECT 
    'order_items policies' as table_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'order_items'

UNION ALL

SELECT 
    'orders policies' as table_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'orders';

-- 9. Test the functions with sample data
-- This will help verify that the functions work correctly
SELECT 'Testing get_order_items_for_user function' as test_name;

-- Test with a sample user (replace with actual user ID)
-- SELECT * FROM get_order_items_for_user('00000000-0000-0000-0000-000000000000');

SELECT 'Testing get_order_items_for_merchant function' as test_name;

-- Test with a sample merchant code
-- SELECT * FROM get_order_items_for_merchant('TEST_MERCHANT');

-- 10. Create a view for debugging order items access
CREATE OR REPLACE VIEW order_items_access_debug AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    o.order_code,
    o.user_id,
    o.merchant_code,
    o.merchant_id,
    o.parent_order_id,
    p.name as product_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.created_at,
    -- Check if current user can access this order item
    CASE 
        WHEN auth.uid() IS NULL THEN 'No auth'
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        ) THEN 'Admin access'
        WHEN o.user_id = auth.uid() THEN 'User access'
        WHEN o.merchant_id IN (
            SELECT id FROM merchants WHERE user_id = auth.uid()
        ) THEN 'Merchant access (by ID)'
        WHEN o.merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        ) THEN 'Merchant access (by code)'
        ELSE 'No access'
    END as access_type
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN products p ON oi.product_id = p.id;

-- 11. Check orders that should have order_items but don't
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
    AND o.cart_items != '{}'::jsonb
GROUP BY o.id, o.order_code, o.cart_items, o.created_at
HAVING COUNT(oi.id) = 0
ORDER BY o.created_at DESC
LIMIT 5;

-- 12. Grant necessary permissions
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON order_items TO anon;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO anon;
GRANT SELECT ON products TO authenticated;
GRANT SELECT ON products TO anon;
GRANT SELECT ON merchants TO authenticated;
GRANT SELECT ON merchants TO anon;
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- 13. Create a comprehensive order items population function
CREATE OR REPLACE FUNCTION populate_order_items_from_cart_fixed()
RETURNS jsonb AS $$
DECLARE
    order_record RECORD;
    cart_item JSONB;
    order_item_id UUID;
    product_id UUID;
    result JSONB := '{"processed": 0, "errors": 0, "details": []}'::jsonb;
BEGIN
    -- Loop through orders that have valid cart_items but no order_items
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
            -- Parse cart_items and create order_items
            FOR cart_item IN SELECT * FROM jsonb_array_elements(order_record.cart_items)
            LOOP
                -- Skip if cart_item is not a valid object
                IF jsonb_typeof(cart_item) != 'object' THEN
                    CONTINUE;
                END IF;
                
                -- Try to find product by name if product_id is not available
                IF cart_item->>'product_id' IS NOT NULL AND cart_item->>'product_id' != '' THEN
                    BEGIN
                        product_id := (cart_item->>'product_id')::uuid;
                    EXCEPTION WHEN OTHERS THEN
                        product_id := NULL;
                    END;
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

-- 14. Run the fixed population function
SELECT populate_order_items_from_cart_fixed();

-- 15. Final verification
SELECT 
    'Final Status Check' as check_type,
    (SELECT COUNT(*) FROM orders WHERE cart_items IS NOT NULL AND cart_items != '[]'::jsonb) as orders_with_cart_items,
    (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_order_items,
    (SELECT COUNT(*) FROM order_items) as total_order_items;