-- Quick Fix for Constraint Violation
-- This script fixes the constraint violation by updating data first

-- ========================================
-- 1. UPDATE ALL INVALID STATUSES
-- ========================================

-- Update all statuses that are not in the allowed list to 'confirmed'
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled');

-- ========================================
-- 2. DROP AND RECREATE CONSTRAINT
-- ========================================

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- ========================================
-- 3. VERIFY THE FIX
-- ========================================

-- Check that all statuses are now valid
SELECT 
    'STATUS CHECK' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;