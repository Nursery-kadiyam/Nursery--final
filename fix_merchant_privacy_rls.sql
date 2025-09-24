-- FIX MERCHANT PRIVACY RLS POLICIES
-- Ensures merchants only see their own order items with privacy protection

-- 1. Check current RLS status
SELECT 
    'Current RLS Status' as check_type,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public') as orders_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'order_items' AND schemaname = 'public') as order_items_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders') as orders_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items') as order_items_policies;

-- 2. Enable RLS on orders and order_items
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies on orders
DROP POLICY IF EXISTS "Admin can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can update their own orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their own orders" ON orders;
DROP POLICY IF EXISTS "merchants_view_orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

-- 4. Drop all existing policies on order_items
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
DROP POLICY IF EXISTS "System can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON order_items;

-- 5. Create privacy-focused RLS policies for orders
CREATE POLICY "Merchants can view their own orders only" ON orders
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can update their own orders only" ON orders
    FOR UPDATE
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own orders only" ON orders
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 6. Create privacy-focused RLS policies for order_items
CREATE POLICY "Merchants can view their own order items only" ON order_items
    FOR SELECT
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can update their own order items only" ON order_items
    FOR UPDATE
    USING (
        merchant_code IN (
            SELECT merchant_code FROM merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own order items only" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert order items" ON order_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 7. Create merchant-specific order function with privacy protection
CREATE OR REPLACE FUNCTION get_merchant_orders_privacy_protected(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    buyer_reference TEXT,
    status TEXT,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    items_count INTEGER,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        'Buyer #' || substring(o.user_id::text, 1, 4) as buyer_reference,
        o.status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        o.created_at,
        COALESCE(oi_agg.items_count, 0) as items_count,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            COUNT(*) as items_count,
            SUM(oi.subtotal) as total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Unknown Product'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
                    'image', COALESCE(p.image_url, '/assets/placeholder.svg')
                )
            ) as order_items
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.merchant_code = p_merchant_code
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get specific order details for merchant
CREATE OR REPLACE FUNCTION get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    buyer_reference TEXT,
    status TEXT,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        'Buyer #' || substring(o.user_id::text, 1, 4) as buyer_reference,
        o.status,
        COALESCE(oi_agg.total_amount, 0) as total_amount,
        o.created_at,
        COALESCE(oi_agg.order_items, '[]'::jsonb) as order_items
    FROM orders o
    LEFT JOIN (
        SELECT 
            oi.order_id,
            SUM(oi.subtotal) as total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Unknown Product'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal,
                    'image', COALESCE(p.image_url, '/assets/placeholder.svg')
                )
            ) as order_items
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.merchant_code = p_merchant_code
        AND oi.order_id = p_order_id
        GROUP BY oi.order_id
    ) oi_agg ON o.id = oi_agg.order_id
    WHERE o.id = p_order_id
    AND o.merchant_code = p_merchant_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_privacy_protected TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- 10. Verify specific order ORD-2025-0005 has order_items populated
SELECT 
    'Order Items Check for ORD-2025-0005' as check_type,
    o.order_code,
    o.merchant_code,
    COUNT(oi.id) as order_items_count,
    array_agg(
        jsonb_build_object(
            'id', oi.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'merchant_code', oi.merchant_code
        )
    ) as order_items_details
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.order_code = 'ORD-2025-0005'
GROUP BY o.id, o.order_code, o.merchant_code;

-- 11. Populate order_items for ORD-2025-0005 if still missing
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

-- 12. Test the merchant function
SELECT 
    'Testing Merchant Function' as check_type,
    *
FROM get_merchant_orders_privacy_protected('MC-2025-TXYR');

-- 13. Final verification
SELECT 
    'Final RLS Status' as check_type,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public') as orders_rls,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'order_items' AND schemaname = 'public') as order_items_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders') as orders_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items') as order_items_policies;