-- COMPLETE RLS AND ORDER ITEMS FIX
-- Based on actual database schema provided

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'order_items', 'products', 'merchants', 'user_profiles', 'quotations')
ORDER BY tablename;

-- 2. Enable RLS on critical tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
DROP POLICY IF EXISTS "System can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON order_items;

-- 4. Create proper RLS policies for order_items
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
                -- Direct merchant assignment by merchant_code
                orders.merchant_code IN (
                    SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
                )
                OR
                -- Merchant ID assignment
                orders.merchant_id IN (
                    SELECT id FROM merchants WHERE user_id = auth.uid()
                )
                OR
                -- Order items with merchant_code matching authenticated merchant
                order_items.merchant_code IN (
                    SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
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

CREATE POLICY "System can insert order items" ON order_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can insert order items for their orders" ON order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- 5. Create RLS policies for merchants table
CREATE POLICY "Users can view their own merchant profile" ON merchants
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Merchants can update their own profile" ON merchants
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all merchants" ON merchants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Anyone can view approved merchants" ON merchants
    FOR SELECT
    USING (status = 'approved');

-- 6. Create RLS policies for products table
CREATE POLICY "Merchants can manage their own products" ON products
    FOR ALL
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all products" ON products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Anyone can view products" ON products
    FOR SELECT
    USING (true);

-- 7. Create RLS policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- 8. Create RLS policies for quotations table
CREATE POLICY "Users can view their own quotations" ON quotations
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Merchants can view quotations for their merchant code" ON quotations
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all quotations" ON quotations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own quotations" ON quotations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 9. Fix orders table RLS policies
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their own orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update their own orders" ON orders;

CREATE POLICY "Merchants can view their orders" ON orders
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
        OR
        merchant_id IN (
            SELECT id FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can update their orders" ON orders
    FOR UPDATE
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
        OR
        merchant_id IN (
            SELECT id FROM merchants WHERE user_id = auth.uid()
        )
    );

-- 10. Grant necessary permissions
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO anon;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON order_items TO anon;
GRANT SELECT ON products TO authenticated;
GRANT SELECT ON products TO anon;
GRANT SELECT ON merchants TO authenticated;
GRANT SELECT ON merchants TO anon;
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON quotations TO authenticated;
GRANT SELECT ON quotations TO anon;

-- 11. Create merchant orders function
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

-- 12. Create user orders function
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

-- 13. Check specific order ORD-2025-0005 and populate order_items if missing
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

-- 14. Populate order_items for ORD-2025-0005 if missing
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
    AND o.cart_items != 'null'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = o.id
    );

-- 15. Update unit_price and subtotal if needed
UPDATE order_items 
SET unit_price = CASE 
    WHEN quantity > 0 AND unit_price = 0 THEN price / quantity 
    ELSE unit_price 
END
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
);

UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE order_id IN (
    SELECT id FROM orders WHERE order_code = 'ORD-2025-0005'
)
AND subtotal = 0;

-- 16. Grant permissions for the functions
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_orders_with_items TO authenticated;

-- 17. Verify the fix
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

-- 18. Test the merchant function
SELECT test_merchant_access('MC-2025-TXYR');

-- 19. Final verification
SELECT 
    'Final Status Check' as check_type,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'merchants' AND schemaname = 'public') as merchants_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'products' AND schemaname = 'public') as products_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'order_items' AND schemaname = 'public') as order_items_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items') as order_items_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'merchants') as merchants_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'products') as products_policies;

-- 20. Create a test function to verify merchant access
CREATE OR REPLACE FUNCTION test_merchant_access(p_merchant_code TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'merchant_code', p_merchant_code,
        'orders_count', (
            SELECT COUNT(*) FROM orders 
            WHERE merchant_code = p_merchant_code
        ),
        'order_items_count', (
            SELECT COUNT(*) FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.merchant_code = p_merchant_code
        ),
        'products_count', (
            SELECT COUNT(*) FROM products 
            WHERE merchant_code = p_merchant_code
        ),
        'merchant_exists', (
            SELECT EXISTS (
                SELECT 1 FROM merchants 
                WHERE merchant_code = p_merchant_code
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;