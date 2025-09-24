-- Cleanup script for duplicate orders
-- This script helps identify and clean up duplicate orders

-- 1. First, let's see what orders exist for the quotation QC-2025-0023
SELECT 
    id,
    order_code,
    quotation_code,
    merchant_code,
    parent_order_id,
    total_amount,
    created_at,
    CASE 
        WHEN parent_order_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as order_type
FROM orders 
WHERE quotation_code = 'QC-2025-0023'
ORDER BY created_at DESC;

-- 2. Identify the parent order (should be the one with parent_order_id = NULL)
-- Keep the parent order, delete the child orders

-- 3. To delete child orders for this quotation (run this if you want to clean up):
-- DELETE FROM orders 
-- WHERE quotation_code = 'QC-2025-0023' 
-- AND parent_order_id IS NOT NULL;

-- 4. To delete all orders for this quotation (if you want to start fresh):
-- DELETE FROM orders 
-- WHERE quotation_code = 'QC-2025-0023';

-- 5. Check the current orders structure
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders
FROM orders 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'your-email@example.com' LIMIT 1);