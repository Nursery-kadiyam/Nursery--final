-- Parent-Child Order Schema Update
-- This script ensures the database schema supports the parent-child order structure

-- 1. Ensure orders table has the required columns for parent-child relationships
DO $$ 
BEGIN
    -- Add parent_order_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'parent_order_id') THEN
        ALTER TABLE orders ADD COLUMN parent_order_id UUID REFERENCES orders(id);
    END IF;
    
    -- Add merchant_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_id') THEN
        ALTER TABLE orders ADD COLUMN merchant_id UUID REFERENCES merchants(id);
    END IF;
    
    -- Add subtotal column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. Create a function to get parent orders with child order details
CREATE OR REPLACE FUNCTION get_parent_orders_with_children(p_user_id UUID)
RETURNS TABLE (
    parent_id UUID,
    parent_order_code TEXT,
    parent_total_amount DECIMAL(10,2),
    parent_status TEXT,
    parent_created_at TIMESTAMPTZ,
    parent_delivery_address JSONB,
    parent_quotation_code TEXT,
    child_orders JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as parent_id,
        p.order_code as parent_order_code,
        p.total_amount as parent_total_amount,
        p.status as parent_status,
        p.created_at as parent_created_at,
        p.delivery_address as parent_delivery_address,
        p.quotation_code as parent_quotation_code,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', c.id,
                    'order_code', c.order_code,
                    'merchant_id', c.merchant_id,
                    'merchant_code', c.merchant_code,
                    'subtotal', c.subtotal,
                    'status', c.status,
                    'created_at', c.created_at
                )
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'::json
        ) as child_orders
    FROM orders p
    LEFT JOIN orders c ON c.parent_order_id = p.id
    WHERE p.user_id = p_user_id 
      AND p.parent_order_id IS NULL
    GROUP BY p.id, p.order_code, p.total_amount, p.status, p.created_at, p.delivery_address, p.quotation_code
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to get child orders for a specific merchant
CREATE OR REPLACE FUNCTION get_merchant_child_orders(p_merchant_id UUID)
RETURNS TABLE (
    child_id UUID,
    child_order_code TEXT,
    parent_order_code TEXT,
    parent_total_amount DECIMAL(10,2),
    child_subtotal DECIMAL(10,2),
    child_status TEXT,
    child_created_at TIMESTAMPTZ,
    customer_info JSONB,
    delivery_address JSONB,
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as child_id,
        c.order_code as child_order_code,
        p.order_code as parent_order_code,
        p.total_amount as parent_total_amount,
        c.subtotal as child_subtotal,
        c.status as child_status,
        c.created_at as child_created_at,
        json_build_object(
            'user_id', p.user_id,
            'delivery_address', p.delivery_address
        ) as customer_info,
        p.delivery_address as delivery_address,
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', oi.id,
                    'product_name', pr.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'price', oi.price,
                    'subtotal', oi.subtotal,
                    'image_url', pr.image_url,
                    'modified_specifications', oi.modified_specifications
                )
            )
            FROM order_items oi
            LEFT JOIN products pr ON pr.id = oi.product_id
            WHERE oi.order_id = c.id),
            '[]'::json
        ) as order_items
    FROM orders c
    JOIN orders p ON p.id = c.parent_order_id
    WHERE c.merchant_id = p_merchant_id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to update order status with proper validation
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_merchant_id UUID,
    p_new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
    order_record RECORD;
    result JSONB;
BEGIN
    -- Get the order details
    SELECT * INTO order_record
    FROM orders 
    WHERE id = p_order_id;
    
    -- Check if order exists
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    
    -- Check if merchant has permission to update this order
    IF order_record.merchant_id != p_merchant_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: This order does not belong to your merchant account');
    END IF;
    
    -- Update the order status
    UPDATE orders 
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', true, 
        'message', 'Order status updated successfully',
        'order_id', p_order_id,
        'new_status', p_new_status
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Create a view for order statistics
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
    COALESCE(SUM(total_amount), 0) as total_revenue
FROM orders;

-- 7. Create RLS policies for parent-child order access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own parent orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own child orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their child orders" ON orders;

-- Create new policies
CREATE POLICY "Users can view their own parent orders" ON orders
    FOR SELECT USING (user_id = auth.uid() AND parent_order_id IS NULL);

CREATE POLICY "Users can view their own child orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Merchants can view their child orders" ON orders
    FOR SELECT USING (
        merchant_id IN (
            SELECT id FROM merchants 
            WHERE user_id = auth.uid()
        ) AND parent_order_id IS NOT NULL
    );

-- 8. Create a function to get order summary for dashboard
CREATE OR REPLACE FUNCTION get_order_dashboard_summary(p_user_id UUID, p_user_role TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_user_role = 'merchant' THEN
        -- Get merchant-specific summary
        SELECT json_build_object(
            'total_orders', COUNT(*),
            'pending_orders', COUNT(CASE WHEN status = 'pending' THEN 1 END),
            'confirmed_orders', COUNT(CASE WHEN status = 'confirmed' THEN 1 END),
            'shipped_orders', COUNT(CASE WHEN status = 'shipped' THEN 1 END),
            'delivered_orders', COUNT(CASE WHEN status = 'delivered' THEN 1 END),
            'total_revenue', COALESCE(SUM(subtotal), 0)
        ) INTO result
        FROM orders o
        JOIN merchants m ON m.id = o.merchant_id
        WHERE m.user_id = p_user_id 
          AND o.parent_order_id IS NOT NULL;
    ELSE
        -- Get user-specific summary
        SELECT json_build_object(
            'total_orders', COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END),
            'active_orders', COUNT(CASE WHEN parent_order_id IS NULL AND status IN ('pending', 'confirmed', 'shipped') THEN 1 END),
            'delivered_orders', COUNT(CASE WHEN parent_order_id IS NULL AND status = 'delivered' THEN 1 END),
            'total_spent', COALESCE(SUM(CASE WHEN parent_order_id IS NULL THEN total_amount ELSE 0 END), 0)
        ) INTO result
        FROM orders
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_parent_orders_with_children(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_child_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_dashboard_summary(UUID, TEXT) TO authenticated;
GRANT SELECT ON order_statistics TO authenticated;

-- 10. Create a trigger to automatically update parent order status based on child orders
CREATE OR REPLACE FUNCTION update_parent_order_status()
RETURNS TRIGGER AS $$
DECLARE
    parent_order_id UUID;
    all_delivered BOOLEAN;
    any_cancelled BOOLEAN;
    new_status TEXT;
BEGIN
    -- Get parent order ID
    parent_order_id := NEW.parent_order_id;
    
    -- If this is not a child order, return
    IF parent_order_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if all child orders are delivered
    SELECT 
        COUNT(*) = COUNT(CASE WHEN status = 'delivered' THEN 1 END),
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) > 0
    INTO all_delivered, any_cancelled
    FROM orders 
    WHERE parent_order_id = parent_order_id;
    
    -- Determine new parent status
    IF any_cancelled THEN
        new_status := 'cancelled';
    ELSIF all_delivered THEN
        new_status := 'delivered';
    ELSE
        new_status := 'processing';
    END IF;
    
    -- Update parent order status
    UPDATE orders 
    SET status = new_status, updated_at = NOW()
    WHERE id = parent_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_parent_order_status ON orders;
CREATE TRIGGER trigger_update_parent_order_status
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_order_status();

-- 11. Add comments for documentation
COMMENT ON FUNCTION get_parent_orders_with_children(UUID) IS 'Returns parent orders with their child order details for a specific user';
COMMENT ON FUNCTION get_merchant_child_orders(UUID) IS 'Returns child orders for a specific merchant with customer and item details';
COMMENT ON FUNCTION update_order_status(UUID, UUID, TEXT) IS 'Updates order status with merchant authorization check';
COMMENT ON FUNCTION get_order_dashboard_summary(UUID, TEXT) IS 'Returns order summary statistics for dashboard display';
COMMENT ON VIEW order_statistics IS 'Provides overall order statistics across all orders';
COMMENT ON TRIGGER trigger_update_parent_order_status ON orders IS 'Automatically updates parent order status based on child order statuses';