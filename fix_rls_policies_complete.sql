-- COMPLETE RLS POLICIES FIX
-- This script fixes all RLS policy issues for proper order items display

-- 1. First, let's check the current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'order_items', 'products', 'merchants', 'user_profiles', 'quotations')
ORDER BY tablename;

-- 2. Enable RLS on all critical tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
DROP POLICY IF EXISTS "System can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON order_items;

-- 4. Create comprehensive RLS policies for order_items
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
                -- Direct merchant assignment
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

-- 9. Fix the orders table RLS policies
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

-- 11. Create a test function to verify merchant access
CREATE OR REPLACE FUNCTION test_merchant_access(p_merchant_code TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Test if we can access orders for this merchant
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

-- 12. Test the access for the specific merchant
SELECT test_merchant_access('MC-2025-TXYR');

-- 13. Verify RLS policies are working
SELECT 
    'RLS Status Check' as check_type,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'merchants' AND schemaname = 'public') as merchants_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'products' AND schemaname = 'public') as products_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'order_items' AND schemaname = 'public') as order_items_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items') as order_items_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'merchants') as merchants_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'products') as products_policies;

-- 14. Check specific order access
SELECT 
    'Order Access Test' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    array_agg(p.name) as product_names
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code;

-- 15. Create a comprehensive access test function
CREATE OR REPLACE FUNCTION test_complete_access()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tables_with_rls', (
            SELECT jsonb_agg(jsonb_build_object(
                'table', tablename,
                'rls_enabled', rowsecurity,
                'policy_count', (
                    SELECT COUNT(*) FROM pg_policies p 
                    WHERE p.tablename = t.tablename
                )
            ))
            FROM pg_tables t
            WHERE schemaname = 'public' 
                AND tablename IN ('orders', 'order_items', 'products', 'merchants', 'user_profiles', 'quotations')
        ),
        'order_items_access', (
            SELECT COUNT(*) FROM order_items
        ),
        'orders_access', (
            SELECT COUNT(*) FROM orders
        ),
        'products_access', (
            SELECT COUNT(*) FROM products
        ),
        'merchants_access', (
            SELECT COUNT(*) FROM merchants
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Run the comprehensive test
SELECT test_complete_access();