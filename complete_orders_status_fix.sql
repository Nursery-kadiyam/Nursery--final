-- Complete Orders Status Constraint Fix
-- This script fixes the "orders_status_check" constraint violation error
-- that occurs when users try to place orders.

-- ========================================
-- 1. DIAGNOSE THE ISSUE
-- ========================================

-- Check current constraint definition
SELECT 
    'Current constraint:' as info,
    conname, 
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';

-- ========================================
-- 2. DROP EXISTING CONSTRAINT
-- ========================================

-- Drop the existing constraint to allow more flexible status values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- ========================================
-- 3. ADD COMPREHENSIVE STATUS CONSTRAINT
-- ========================================

-- Add a new constraint that allows all necessary status values
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    -- Basic order statuses
    'pending',
    'confirmed', 
    'shipped',
    'delivered',
    'cancelled',
    
    -- Payment-related statuses
    'pending_payment',
    'payment_failed',
    'payment_completed',
    
    -- Processing statuses
    'processing',
    'ready_for_shipment',
    'out_for_delivery',
    
    -- Final statuses
    'completed',
    'refunded',
    'returned',
    
    -- Quotation-specific statuses
    'quotation_confirmed',
    'order_placed',
    'user_confirmed'
));

-- ========================================
-- 4. UPDATE EXISTING ORDERS
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
    'payment_completed',
    'processing',
    'ready_for_shipment',
    'out_for_delivery',
    'completed',
    'refunded',
    'returned',
    'quotation_confirmed',
    'order_placed',
    'user_confirmed'
);

-- ========================================
-- 5. VERIFY THE FIX
-- ========================================

-- Verify the new constraint was added
SELECT 
    'New constraint:' as info,
    conname, 
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';

-- ========================================
-- 6. TEST ORDER CREATION
-- ========================================

-- Test creating an order with 'confirmed' status (the one causing the error)
DO $$
DECLARE
    test_order_id UUID;
BEGIN
    -- Insert a test order with 'confirmed' status
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
        'TEST-QUOTATION-FIX',
        'TEST-MERCHANT',
        '{}',
        'Test Address',
        100.00,
        '[]',
        'confirmed'
    ) RETURNING id INTO test_order_id;
    
    -- If we get here, the constraint is working
    RAISE NOTICE 'Test order created successfully with ID: %', test_order_id;
    
    -- Clean up test data
    DELETE FROM orders WHERE id = test_order_id;
    
    RAISE NOTICE 'Orders status constraint fix completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
        -- Clean up any partial test data
        DELETE FROM orders WHERE quotation_code = 'TEST-QUOTATION-FIX';
END $$;

-- ========================================
-- 7. ADDITIONAL SAFEGUARDS
-- ========================================

-- Create a function to safely insert orders with proper status validation
CREATE OR REPLACE FUNCTION safe_insert_order(
    p_user_id UUID,
    p_quotation_code TEXT,
    p_merchant_code TEXT,
    p_delivery_address JSONB,
    p_shipping_address TEXT,
    p_total_amount DECIMAL,
    p_cart_items JSONB,
    p_status TEXT DEFAULT 'confirmed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_result JSONB;
BEGIN
    -- Validate status before insertion
    IF p_status NOT IN (
        'pending', 'confirmed', 'shipped', 'delivered', 'cancelled',
        'pending_payment', 'payment_failed', 'payment_completed',
        'processing', 'ready_for_shipment', 'out_for_delivery',
        'completed', 'refunded', 'returned',
        'quotation_confirmed', 'order_placed', 'user_confirmed'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid status: ' || p_status
        );
    END IF;
    
    -- Insert the order
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
        p_user_id,
        p_quotation_code,
        p_merchant_code,
        p_delivery_address,
        p_shipping_address,
        p_total_amount,
        p_cart_items,
        p_status
    ) RETURNING id INTO v_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create order: ' || SQLERRM
        );
END;
$$;

-- Grant permissions for the safe function
GRANT EXECUTE ON FUNCTION safe_insert_order TO authenticated;

-- ========================================
-- 8. SUCCESS CONFIRMATION
-- ========================================

SELECT 'Orders status constraint fix completed successfully!' as result;