-- Fix for get_merchant_orders function
-- This script corrects the function to work with the actual database structure

-- First, let's check what columns actually exist in the user_profiles table
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_merchant_orders(TEXT);

-- Create a corrected version of the get_merchant_orders function
CREATE OR REPLACE FUNCTION get_merchant_orders(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    quotation_code TEXT,
    user_email TEXT,
    customer_name TEXT,
    items JSONB,
    total_amount DECIMAL(10,2),
    order_status TEXT,
    delivery_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.quotation_code,
        o.customer_details->>'email' as user_email,
        COALESCE(
            o.customer_details->>'customer_name',
            o.customer_details->>'name',
            'Unknown Customer'
        ) as customer_name,
        o.cart_items as items,
        o.total_amount,
        COALESCE(o.order_status, o.status, 'pending') as order_status,
        COALESCE(o.delivery_status, 'pending') as delivery_status,
        o.created_at,
        o.customer_details->>'phone' as customer_phone
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Also fix the update_order_delivery_status function
DROP FUNCTION IF EXISTS update_order_delivery_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_order_delivery_status(
    p_order_id UUID,
    p_merchant_code TEXT,
    p_delivery_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update the order status
    UPDATE orders 
    SET 
        delivery_status = p_delivery_status,
        order_status = p_delivery_status, -- Also update order_status for consistency
        updated_at = NOW()
    WHERE id = p_order_id 
    AND merchant_code = p_merchant_code;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order status updated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found or access denied'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to update order status: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_delivery_status(UUID, TEXT, TEXT) TO authenticated;

-- Test the function
SELECT 'Functions created successfully!' as status;

-- Show the function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_merchant_orders', 'update_order_delivery_status')
ORDER BY routine_name;
