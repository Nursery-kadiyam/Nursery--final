-- Fix Constraint Violation - Safe Approach
-- This script first updates existing data, then applies the constraint

-- ========================================
-- 1. CHECK CURRENT DATA
-- ========================================

-- First, let's see what status values currently exist
SELECT 
    'CURRENT STATUS VALUES' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- ========================================
-- 2. UPDATE EXISTING DATA TO VALID STATUSES
-- ========================================

-- Update all invalid status values to 'confirmed'
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled');

-- Update specific common invalid statuses
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status IN ('pending', 'pending_payment', 'processing', 'in_progress', 'active');

-- Update any NULL statuses
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE status IS NULL;

-- ========================================
-- 3. VERIFY DATA IS CLEAN
-- ========================================

-- Check that all status values are now valid
SELECT 
    'CLEANED STATUS VALUES' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Check for any remaining invalid statuses
SELECT 
    'INVALID STATUS CHECK' as info,
    status,
    COUNT(*) as count
FROM orders 
WHERE status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled')
GROUP BY status;

-- ========================================
-- 4. DROP AND RECREATE CONSTRAINT SAFELY
-- ========================================

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled'));

-- ========================================
-- 5. VERIFY CONSTRAINT IS APPLIED
-- ========================================

-- Check that the constraint was applied successfully
SELECT 
    'CONSTRAINT VERIFICATION' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_status_check';

-- Test the constraint by trying to insert an invalid status (this should fail)
-- Uncomment the line below to test:
-- INSERT INTO orders (user_id, status) VALUES ('00000000-0000-0000-0000-000000000000', 'invalid_status');

-- ========================================
-- 6. FINAL STATUS CHECK
-- ========================================

-- Final check of all order statuses
SELECT 
    'FINAL STATUS DISTRIBUTION' as info,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders 
GROUP BY status
ORDER BY status;