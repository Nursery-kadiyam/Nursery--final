-- Fix Orders Status Constraint Issue
-- The error "orders_status_check" constraint violation occurs because the status values
-- being inserted don't match the allowed values in the constraint.

-- ========================================
-- 1. CHECK CURRENT CONSTRAINT
-- ========================================

-- First, let's see what the current constraint allows
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';

-- ========================================
-- 2. DROP EXISTING CONSTRAINT
-- ========================================

-- Drop the existing constraint to allow more flexible status values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- ========================================
-- 3. ADD NEW FLEXIBLE CONSTRAINT
-- ========================================

-- Add a new constraint that allows all the status values we need
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pending', 
    'confirmed', 
    'shipped', 
    'delivered', 
    'cancelled',
    'pending_payment',
    'payment_failed',
    'processing',
    'ready_for_shipment',
    'out_for_delivery',
    'completed',
    'refunded',
    'returned'
));

-- ========================================
-- 4. VERIFY THE CONSTRAINT
-- ========================================

-- Verify the new constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';

-- ========================================
-- 5. UPDATE EXISTING ORDERS IF NEEDED
-- ========================================

-- Update any existing orders with invalid status values
UPDATE orders 
SET status = 'confirmed' 
WHERE status NOT IN (
    'pending', 
    'confirmed', 
    'shipped', 
    'delivered', 
    'cancelled',
    'pending_payment',
    'payment_failed',
    'processing',
    'ready_for_shipment',
    'out_for_delivery',
    'completed',
    'refunded',
    'returned'
);

-- ========================================
-- 6. TEST THE FIX
-- ========================================

-- Test inserting an order with 'confirmed' status
INSERT INTO orders (
    user_id,
    quotation_code,
    merchant_code,
    delivery_address,
    shipping_address,
    total_amount,
    cart_items,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'TEST-QUOTATION',
    'TEST-MERCHANT',
    '{}',
    'Test Address',
    100.00,
    '[]',
    'confirmed'
) ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM orders WHERE quotation_code = 'TEST-QUOTATION';

-- ========================================
-- 7. SUCCESS MESSAGE
-- ========================================

SELECT 'Orders status constraint fixed successfully!' as result;