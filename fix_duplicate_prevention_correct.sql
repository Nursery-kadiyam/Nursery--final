-- Correct duplicate prevention for orders using partial indexes
-- This script uses partial indexes instead of constraints with WHERE clauses

-- 1. Create partial unique index for parent orders (only one parent order per quotation per user)
CREATE UNIQUE INDEX IF NOT EXISTS unique_parent_order_per_quotation 
ON orders (quotation_code, user_id) 
WHERE parent_order_id IS NULL;

-- 2. Create partial unique index for child orders (only one child order per quotation per user per merchant)
CREATE UNIQUE INDEX IF NOT EXISTS unique_child_order_per_quotation_merchant 
ON orders (quotation_code, user_id, merchant_code) 
WHERE parent_order_id IS NOT NULL;

-- 3. Create regular index for performance
CREATE INDEX IF NOT EXISTS idx_orders_quotation_user_parent 
ON orders (quotation_code, user_id, parent_order_id);

-- 4. Test the indexes by checking existing data
SELECT 
    quotation_code,
    user_id,
    COUNT(*) as order_count,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_count,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_count
FROM orders 
WHERE quotation_code = 'QC-2025-0023'
GROUP BY quotation_code, user_id;

-- 5. Show current orders for the problematic quotation
SELECT 
    id,
    order_code,
    quotation_code,
    parent_order_id,
    merchant_code,
    created_at,
    CASE 
        WHEN parent_order_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as order_type
FROM orders 
WHERE quotation_code = 'QC-2025-0023'
ORDER BY created_at DESC;