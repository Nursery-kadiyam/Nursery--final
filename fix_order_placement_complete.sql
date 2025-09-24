-- Complete Fix for Order Placement Issues
-- This fixes both the constraint issue and the missing columns issue

-- ========================================
-- 1. FIX ORDERS STATUS CONSTRAINT
-- ========================================

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add a comprehensive constraint that includes all valid statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_payment'));

-- ========================================
-- 2. ADD MISSING COLUMNS TO ORDER_ITEMS
-- ========================================

-- Add merchant_code column to order_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'merchant_code') THEN
        ALTER TABLE order_items ADD COLUMN merchant_code TEXT;
        RAISE NOTICE 'Added merchant_code column to order_items table';
    ELSE
        RAISE NOTICE 'merchant_code column already exists in order_items table';
    END IF;
END $$;

-- Add subtotal column to order_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'subtotal') THEN
        ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10,2);
        RAISE NOTICE 'Added subtotal column to order_items table';
    ELSE
        RAISE NOTICE 'subtotal column already exists in order_items table';
    END IF;
END $$;

-- Add quotation_id column to order_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'quotation_id') THEN
        ALTER TABLE order_items ADD COLUMN quotation_id TEXT;
        RAISE NOTICE 'Added quotation_id column to order_items table';
    ELSE
        RAISE NOTICE 'quotation_id column already exists in order_items table';
    END IF;
END $$;

-- ========================================
-- 3. ADD MISSING COLUMNS TO ORDERS
-- ========================================

-- Add merchant_code column to orders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_code') THEN
        ALTER TABLE orders ADD COLUMN merchant_code TEXT;
        RAISE NOTICE 'Added merchant_code column to orders table';
    ELSE
        RAISE NOTICE 'merchant_code column already exists in orders table';
    END IF;
END $$;

-- Add quotation_code column to orders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'quotation_code') THEN
        ALTER TABLE orders ADD COLUMN quotation_code TEXT;
        RAISE NOTICE 'Added quotation_code column to orders table';
    ELSE
        RAISE NOTICE 'quotation_code column already exists in orders table';
    END IF;
END $$;

-- ========================================
-- 4. UPDATE EXISTING ORDERS WITH INVALID STATUS
-- ========================================

-- Update any existing orders with invalid status to 'pending'
UPDATE orders 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_payment');

-- ========================================
-- 5. VERIFY THE FIX
-- ========================================

-- Verify constraint was added successfully
SELECT 
    'CONSTRAINT VERIFICATION' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_status_check';

-- Verify current orders status
SELECT 
    'CURRENT ORDERS STATUS CHECK' as info,
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;

-- Verify order_items table structure
SELECT 
    'ORDER_ITEMS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- Verify orders table structure
SELECT 
    'ORDERS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;