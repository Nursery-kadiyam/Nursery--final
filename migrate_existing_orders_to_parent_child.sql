-- Migrate Existing Orders to Parent-Child Structure
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. FIRST, ENSURE SCHEMA IS UPDATED
-- ========================================

-- Add parent-child columns if they don't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_subtotal ON public.order_items(subtotal);

-- ========================================
-- 3. MIGRATE EXISTING ORDERS
-- ========================================

-- Step 1: Update existing orders to set merchant_id based on merchant_code
UPDATE public.orders 
SET merchant_id = m.id
FROM public.merchants m 
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- Step 2: Calculate subtotal for existing order_items
UPDATE public.order_items 
SET subtotal = (quantity * COALESCE(unit_price, price))
WHERE subtotal = 0 OR subtotal IS NULL;

-- Step 3: Update existing orders subtotal to be sum of their order_items subtotals
UPDATE public.orders 
SET subtotal = COALESCE(
    (SELECT SUM(oi.subtotal) 
     FROM public.order_items oi 
     WHERE oi.order_id = orders.id), 
    total_amount
)
WHERE subtotal = 0 OR subtotal IS NULL;

-- ========================================
-- 4. CREATE PARENT ORDERS FOR EXISTING ORDERS
-- ========================================

-- Create a temporary table to store order groups by user and date
CREATE TEMP TABLE order_groups AS
SELECT 
    user_id,
    DATE(created_at) as order_date,
    MIN(created_at) as first_order_time,
    COUNT(*) as order_count,
    SUM(total_amount) as total_amount_sum
FROM public.orders 
WHERE parent_order_id IS NULL 
AND merchant_code IS NOT NULL 
AND merchant_code != 'parent'
GROUP BY user_id, DATE(created_at)
HAVING COUNT(*) > 1; -- Only groups with multiple orders

-- Create parent orders for each group
INSERT INTO public.orders (
    user_id,
    parent_order_id,
    merchant_id,
    merchant_code,
    delivery_address,
    shipping_address,
    total_amount,
    subtotal,
    cart_items,
    status,
    created_at,
    updated_at
)
SELECT 
    og.user_id,
    NULL as parent_order_id,
    NULL as merchant_id,
    'parent' as merchant_code,
    (SELECT delivery_address FROM public.orders o2 WHERE o2.user_id = og.user_id AND DATE(o2.created_at) = og.order_date LIMIT 1) as delivery_address,
    (SELECT shipping_address FROM public.orders o2 WHERE o2.user_id = og.user_id AND DATE(o2.created_at) = og.order_date LIMIT 1) as shipping_address,
    og.total_amount_sum as total_amount,
    og.total_amount_sum as subtotal,
    '[]'::jsonb as cart_items,
    'pending' as status,
    og.first_order_time as created_at,
    NOW() as updated_at
FROM order_groups og;

-- ========================================
-- 5. UPDATE EXISTING ORDERS TO BE CHILD ORDERS
-- ========================================

-- Update existing orders to be child orders of the parent orders we just created
UPDATE public.orders 
SET parent_order_id = parent_orders.id
FROM (
    SELECT 
        og.user_id,
        og.order_date,
        p.id
    FROM order_groups og
    JOIN public.orders p ON p.user_id = og.user_id 
        AND p.merchant_code = 'parent' 
        AND DATE(p.created_at) = og.order_date
) parent_orders
WHERE orders.user_id = parent_orders.user_id 
AND DATE(orders.created_at) = parent_orders.order_date
AND orders.merchant_code != 'parent'
AND orders.parent_order_id IS NULL;

-- ========================================
-- 6. CLEAN UP TEMPORARY TABLE
-- ========================================

DROP TABLE order_groups;

-- ========================================
-- 7. VERIFY MIGRATION
-- ========================================

-- Check parent orders
SELECT 
    'Parent Orders' as order_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM public.orders 
WHERE parent_order_id IS NULL 
AND merchant_code = 'parent';

-- Check child orders
SELECT 
    'Child Orders' as order_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM public.orders 
WHERE parent_order_id IS NOT NULL;

-- Check orders that weren't migrated (single orders)
SELECT 
    'Single Orders' as order_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM public.orders 
WHERE parent_order_id IS NULL 
AND merchant_code != 'parent';

-- ========================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.orders.parent_order_id IS 'References parent order for child orders. NULL for parent orders.';
COMMENT ON COLUMN public.orders.merchant_id IS 'References merchant for child orders. NULL for parent orders.';
COMMENT ON COLUMN public.orders.subtotal IS 'Subtotal for this order. For parent orders, this equals total_amount.';
COMMENT ON COLUMN public.order_items.subtotal IS 'Subtotal for this order item (quantity * unit_price).';