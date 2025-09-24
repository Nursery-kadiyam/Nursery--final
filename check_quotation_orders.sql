-- Check existing orders for quotation QC-2025-0025
SELECT 
    id, 
    order_code, 
    quotation_code, 
    merchant_code, 
    status, 
    created_at,
    parent_order_id
FROM orders 
WHERE quotation_code = 'QC-2025-0025'
ORDER BY created_at DESC;

-- Check if there are any constraints on the orders table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass
AND conname LIKE '%parent%' OR conname LIKE '%quotation%';