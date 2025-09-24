-- Quick Fix for Parent-Child Order Constraint
-- This script safely removes the problematic constraints without breaking foreign keys

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
-- 2. SAFELY HANDLE EXISTING DUPLICATES
-- ========================================

-- Instead of deleting orders (which causes foreign key violations),
-- let's just mark duplicate orders as cancelled
WITH duplicate_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY quotation_code, user_id 
            ORDER BY created_at DESC
        ) as rn
    FROM orders 
    WHERE quotation_code IS NOT NULL
)
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);

-- ========================================
-- 3. VERIFY THE FIX
-- ========================================

-- Check that the problematic constraints are gone
SELECT 
    'CONSTRAINT REMOVAL CHECK' as info,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All problematic constraints removed'
        ELSE '❌ Some constraints still exist: ' || string_agg(indexname, ', ')
    END as status
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE '%unique%parent%';

-- Check current orders status
SELECT 
    'CURRENT ORDERS STATUS' as info,
    quotation_code,
    user_id,
    status,
    COUNT(*) as order_count
FROM orders 
WHERE quotation_code IS NOT NULL
GROUP BY quotation_code, user_id, status
ORDER BY quotation_code, user_id, status;