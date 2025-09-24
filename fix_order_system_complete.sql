-- COMPLETE ORDER SYSTEM FIX
-- This script fixes all order system issues: parent-child relations, pricing, and merchant data

-- ========================================
-- 1. ADD MISSING COLUMNS TO ORDERS TABLE
-- ========================================

-- Add parent-child and merchant columns if they don't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS merchant_code VARCHAR(50) DEFAULT NULL;

-- Add subtotal to order_items if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON public.orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_order_items_subtotal ON public.order_items(subtotal);
CREATE INDEX IF NOT EXISTS idx_orders_user_parent ON public.orders(user_id, parent_order_id);

-- ========================================
-- 3. FIX EXISTING DATA
-- ========================================

-- Update existing orders to set merchant_id based on merchant_code
UPDATE public.orders 
SET merchant_id = m.id
FROM public.merchants m 
WHERE orders.merchant_code = m.merchant_code
AND orders.merchant_id IS NULL;

-- Calculate subtotal for existing order_items
UPDATE public.order_items 
SET subtotal = (quantity * COALESCE(unit_price, price))
WHERE subtotal = 0 OR subtotal IS NULL;

-- Update unit_price if it's 0 or NULL
UPDATE public.order_items 
SET unit_price = CASE 
    WHEN quantity > 0 THEN price / quantity
    ELSE price
END
WHERE unit_price = 0 OR unit_price IS NULL;

-- Update existing orders subtotal to be sum of their order_items subtotals
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

-- Create parent orders for existing orders that don't have parent_order_id
-- This groups orders by user and date to create logical parent orders
WITH order_groups AS (
    SELECT 
        user_id,
        DATE(created_at) as order_date,
        MIN(created_at) as first_order_time,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount_sum,
        -- Get the first delivery_address from the group
        (SELECT delivery_address FROM public.orders o2 
         WHERE o2.user_id = orders.user_id 
         AND DATE(o2.created_at) = DATE(orders.created_at) 
         AND o2.delivery_address IS NOT NULL 
         ORDER BY o2.created_at LIMIT 1) as delivery_address,
        -- Get the first shipping_address from the group
        (SELECT shipping_address FROM public.orders o2 
         WHERE o2.user_id = orders.user_id 
         AND DATE(o2.created_at) = DATE(orders.created_at) 
         AND o2.shipping_address IS NOT NULL 
         ORDER BY o2.created_at LIMIT 1) as shipping_address
    FROM public.orders 
    WHERE parent_order_id IS NULL 
    AND merchant_code IS NOT NULL 
    AND merchant_code != 'parent'
    GROUP BY user_id, DATE(created_at)
    HAVING COUNT(*) > 1
),
parent_orders AS (
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
        updated_at,
        order_code
    )
    SELECT 
        og.user_id,
        NULL as parent_order_id,
        NULL as merchant_id,
        'parent' as merchant_code,
        og.delivery_address,
        og.shipping_address,
        og.total_amount_sum as total_amount,
        og.total_amount_sum as subtotal,
        '[]'::jsonb as cart_items,
        'pending' as status,
        og.first_order_time as created_at,
        NOW() as updated_at,
        'PARENT-' || SUBSTRING(gen_random_uuid()::text, 1, 8) as order_code
    FROM order_groups og
    RETURNING id, user_id, created_at
)
UPDATE public.orders 
SET parent_order_id = po.id
FROM parent_orders po
WHERE orders.user_id = po.user_id 
AND DATE(orders.created_at) = DATE(po.created_at)
AND orders.merchant_code != 'parent'
AND orders.parent_order_id IS NULL;

-- ========================================
-- 5. FIX PRICING CALCULATIONS
-- ========================================

-- Recalculate all order_items subtotals
UPDATE public.order_items 
SET subtotal = (quantity * COALESCE(unit_price, price))
WHERE subtotal != (quantity * COALESCE(unit_price, price));

-- Recalculate all child order subtotals
UPDATE public.orders 
SET subtotal = COALESCE(
    (SELECT SUM(oi.subtotal) 
     FROM public.order_items oi 
     WHERE oi.order_id = orders.id), 
    0
)
WHERE parent_order_id IS NOT NULL;

-- Recalculate all parent order totals
UPDATE public.orders 
SET total_amount = COALESCE(
    (SELECT SUM(child.subtotal) 
     FROM public.orders child 
     WHERE child.parent_order_id = orders.id), 
    subtotal
),
subtotal = COALESCE(
    (SELECT SUM(child.subtotal) 
     FROM public.orders child 
     WHERE child.parent_order_id = orders.id), 
    subtotal
)
WHERE parent_order_id IS NULL;

-- ========================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.orders.parent_order_id IS 'References parent order for child orders. NULL for parent orders.';
COMMENT ON COLUMN public.orders.merchant_id IS 'References merchant for child orders. NULL for parent orders.';
COMMENT ON COLUMN public.orders.subtotal IS 'Subtotal for this order. For parent orders, this equals total_amount.';
COMMENT ON COLUMN public.order_items.subtotal IS 'Subtotal for this order item (quantity * unit_price).';

-- ========================================
-- 7. VERIFY FIXES
-- ========================================

-- Check for any orders without proper parent-child structure
SELECT 
    'Orders without parent-child structure' as issue,
    COUNT(*) as count
FROM public.orders 
WHERE parent_order_id IS NULL 
AND merchant_code IS NOT NULL 
AND merchant_code != 'parent';

-- Check for any order_items without subtotal
SELECT 
    'Order items without subtotal' as issue,
    COUNT(*) as count
FROM public.order_items 
WHERE subtotal = 0 OR subtotal IS NULL;

-- Check for any orders without subtotal
SELECT 
    'Orders without subtotal' as issue,
    COUNT(*) as count
FROM public.orders 
WHERE subtotal = 0 OR subtotal IS NULL;

-- Check parent-child relationships
SELECT 
    'Parent orders' as type,
    COUNT(*) as count
FROM public.orders 
WHERE parent_order_id IS NULL;

SELECT 
    'Child orders' as type,
    COUNT(*) as count
FROM public.orders 
WHERE parent_order_id IS NOT NULL;

-- Check pricing accuracy
SELECT 
    'Orders with pricing issues' as issue,
    COUNT(*) as count
FROM public.orders 
WHERE total_amount != subtotal 
AND parent_order_id IS NULL;

-- ========================================
-- 8. FINAL CLEANUP
-- ========================================

-- Ensure all orders have proper order_code
UPDATE public.orders 
SET order_code = 'ORD-' || SUBSTRING(gen_random_uuid()::text, 1, 12)
WHERE order_code IS NULL OR order_code = '';

-- Ensure all orders have proper status
UPDATE public.orders 
SET status = 'pending'
WHERE status IS NULL OR status = '';

-- ========================================
-- 9. SUCCESS MESSAGE
-- ========================================

SELECT 'Order system fix completed successfully!' as status;