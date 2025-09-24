-- Fix Parent-Child Order Constraint Issue
-- This script properly handles the foreign key constraint when cleaning up duplicate orders

-- ========================================
-- 1. REMOVE PROBLEMATIC UNIQUE CONSTRAINTS
-- ========================================

-- Drop the unique indexes that are causing the duplicate key violation
DROP INDEX IF EXISTS unique_parent_order_per_quotation;
DROP INDEX IF EXISTS unique_child_order_per_quotation_merchant;

-- Drop any constraints with the same name
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_parent_order_per_quotation;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_child_order_per_quotation_merchant;

-- ========================================
-- 2. SAFELY CLEAN UP DUPLICATE ORDERS
-- ========================================

-- First, let's see what we're dealing with
SELECT 
    'BEFORE CLEANUP' as info,
    quotation_code,
    user_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders
FROM orders 
WHERE quotation_code IS NOT NULL
GROUP BY quotation_code, user_id
ORDER BY quotation_code, user_id;

-- Clean up duplicate orders by handling parent-child relationships properly
-- Step 1: Delete child orders first (they don't have dependencies)
WITH duplicate_child_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY quotation_code, user_id, parent_order_id
            ORDER BY created_at DESC
        ) as rn
    FROM orders 
    WHERE quotation_code IS NOT NULL 
    AND parent_order_id IS NOT NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_child_orders WHERE rn > 1
);

-- Step 2: Delete duplicate parent orders (only if they have no child orders)
WITH duplicate_parent_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY quotation_code, user_id 
            ORDER BY created_at DESC
        ) as rn,
        -- Check if this parent has any child orders
        (SELECT COUNT(*) FROM orders o2 WHERE o2.parent_order_id = orders.id) as child_count
    FROM orders 
    WHERE quotation_code IS NOT NULL 
    AND parent_order_id IS NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_parent_orders 
    WHERE rn > 1 AND child_count = 0
);

-- Step 3: For parent orders that have children, update the oldest ones to cancelled status
-- instead of deleting them to avoid foreign key violations
WITH duplicate_parent_orders_with_children AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY quotation_code, user_id 
            ORDER BY created_at DESC
        ) as rn,
        (SELECT COUNT(*) FROM orders o2 WHERE o2.parent_order_id = orders.id) as child_count
    FROM orders 
    WHERE quotation_code IS NOT NULL 
    AND parent_order_id IS NULL
)
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicate_parent_orders_with_children 
    WHERE rn > 1 AND child_count > 0
);

-- ========================================
-- 3. CREATE A BETTER UNIQUE CONSTRAINT
-- ========================================

-- Create a more flexible unique constraint that allows updates
-- This will prevent true duplicates but allow order updates
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_order_per_quotation 
ON orders (quotation_code, user_id) 
WHERE status NOT IN ('cancelled', 'refunded') 
AND parent_order_id IS NULL;

-- ========================================
-- 4. VERIFY THE CLEANUP
-- ========================================

-- Check the results after cleanup
SELECT 
    'AFTER CLEANUP' as info,
    quotation_code,
    user_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN parent_order_id IS NULL THEN 1 END) as parent_orders,
    COUNT(CASE WHEN parent_order_id IS NOT NULL THEN 1 END) as child_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders 
WHERE quotation_code IS NOT NULL
GROUP BY quotation_code, user_id
ORDER BY quotation_code, user_id;

-- Check for any remaining duplicates
SELECT 
    'REMAINING DUPLICATES CHECK' as info,
    quotation_code,
    user_id,
    COUNT(*) as order_count
FROM orders 
WHERE quotation_code IS NOT NULL
GROUP BY quotation_code, user_id
HAVING COUNT(*) > 1;

-- Show the current constraint status
SELECT 
    'CONSTRAINT STATUS' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE '%unique%';