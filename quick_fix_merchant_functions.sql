-- Quick Fix: Drop and recreate merchant order functions
-- This resolves the "cannot change return type" error

-- Drop existing functions
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);
DROP FUNCTION IF EXISTS get_merchant_orders_simple(text);

-- Create simple function first
CREATE OR REPLACE FUNCTION get_merchant_orders_simple(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    merchant_code TEXT,
    buyer_reference TEXT,
    cart_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.total_amount,
        o.created_at,
        o.status,
        o.merchant_code,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(o.cart_items, '[]'::jsonb) as cart_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_simple TO authenticated;

-- Test the function
SELECT 'Function created successfully!' as status;