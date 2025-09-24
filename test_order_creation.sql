-- Test query to check if orders were created
-- Replace 'your-user-id' with the actual user ID

-- Check recent orders
SELECT 
    id, 
    order_code, 
    quotation_code, 
    merchant_code, 
    status, 
    total_amount,
    created_at,
    user_id
FROM orders 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check order_items for recent orders
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    oi.merchant_code,
    oi.quotation_id,
    o.order_code,
    o.quotation_code
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC;

-- Check if there are any orders for quotation QC-2025-0025
SELECT 
    id, 
    order_code, 
    quotation_code, 
    merchant_code, 
    status, 
    total_amount,
    created_at
FROM orders 
WHERE quotation_code = 'QC-2025-0025'
ORDER BY created_at DESC;