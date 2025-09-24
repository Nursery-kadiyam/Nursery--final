-- Safe cleanup of duplicate orders without deleting all orders
-- This script identifies and removes only duplicate parent orders

-- Step 1: First, let's see what duplicate orders exist
SELECT 
    quotation_code,
    user_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders
FROM orders 
WHERE quotation_code = 'QC-2025-0023'
GROUP BY quotation_code, user_id
HAVING COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) > 1;

-- Step 2: Show all orders for this quotation to see the duplicates
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

-- Step 3: Identify which parent order to keep (the most recent one)
-- and which ones to delete (older duplicates)
WITH duplicate_parents AS (
    SELECT 
        id,
        order_code,
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM orders 
    WHERE quotation_code = 'QC-2025-0023' 
    AND parent_order_id IS NULL
)
SELECT 
    id,
    order_code,
    created_at,
    CASE 
        WHEN rn = 1 THEN 'KEEP (most recent)'
        ELSE 'DELETE (duplicate)'
    END as action
FROM duplicate_parents
ORDER BY created_at DESC;

-- Step 4: Delete only the older duplicate parent orders
-- (Keep the most recent parent order and all its children)
WITH duplicate_parents AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM orders 
    WHERE quotation_code = 'QC-2025-0023' 
    AND parent_order_id IS NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id 
    FROM duplicate_parents 
    WHERE rn > 1
);

-- Step 5: Verify the cleanup worked
SELECT 
    quotation_code,
    user_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders
FROM orders 
WHERE quotation_code = 'QC-2025-0023'
GROUP BY quotation_code, user_id;

-- Step 6: Now create the unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS unique_parent_order_per_quotation 
ON orders (quotation_code, user_id) 
WHERE parent_order_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_child_order_per_quotation_merchant 
ON orders (quotation_code, user_id, merchant_code) 
WHERE parent_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_quotation_user_parent 
ON orders (quotation_code, user_id, parent_order_id);

-- Step 7: Final verification - show remaining orders
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