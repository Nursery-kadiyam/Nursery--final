-- Fix Duplicate Order Constraint Issue
-- This script removes the problematic unique constraint that prevents order placement

-- ========================================
-- 1. REMOVE PROBLEMATIC UNIQUE CONSTRAINTS
-- ========================================

-- Drop the unique constraint that's causing the duplicate key violation
DROP INDEX IF EXISTS unique_parent_order_per_quotation;
DROP INDEX IF EXISTS unique_child_order_per_quotation_merchant;

-- Drop any constraints with the same name
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_parent_order_per_quotation;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_child_order_per_quotation_merchant;

-- ========================================
-- 2. CLEAN UP EXISTING DUPLICATE ORDERS
-- ========================================

-- Find and remove duplicate orders for the same quotation and user
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
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);

-- ========================================
-- 3. CREATE A BETTER UNIQUE CONSTRAINT
-- ========================================

-- Create a more flexible unique constraint that allows updates
-- This will prevent true duplicates but allow order updates
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_order_per_quotation 
ON orders (quotation_code, user_id) 
WHERE status NOT IN ('cancelled', 'refunded');

-- ========================================
-- 4. UPDATE ORDER PLACEMENT FUNCTION
-- ========================================

-- Create an improved order placement function that handles duplicates better
CREATE OR REPLACE FUNCTION create_or_update_simple_order(
    p_user_id UUID,
    p_delivery_address JSONB,
    p_cart_items JSONB,
    p_total_amount NUMERIC,
    p_quotation_code TEXT DEFAULT NULL,
    p_merchant_code TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_code TEXT;
    v_item_data JSONB;
    v_order_item_id UUID;
    v_existing_order_id UUID;
BEGIN
    -- Check if an order already exists for this quotation and user
    IF p_quotation_code IS NOT NULL THEN
        SELECT id INTO v_existing_order_id
        FROM orders 
        WHERE quotation_code = p_quotation_code 
        AND user_id = p_user_id
        AND status NOT IN ('cancelled', 'refunded')
        LIMIT 1;
        
        -- If order exists, update it instead of creating a new one
        IF v_existing_order_id IS NOT NULL THEN
            -- Delete existing order items
            DELETE FROM order_items WHERE order_id = v_existing_order_id;
            
            -- Update the existing order
            UPDATE orders SET
                delivery_address = p_delivery_address,
                cart_items = p_cart_items,
                total_amount = p_total_amount,
                merchant_code = p_merchant_code,
                status = 'confirmed',
                updated_at = NOW()
            WHERE id = v_existing_order_id
            RETURNING id INTO v_order_id;
            
            -- Get the order code
            SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        ELSE
            -- Create new order
            INSERT INTO orders (
                user_id,
                delivery_address,
                cart_items,
                total_amount,
                quotation_code,
                merchant_code,
                status
            ) VALUES (
                p_user_id,
                p_delivery_address,
                p_cart_items,
                p_total_amount,
                p_quotation_code,
                p_merchant_code,
                'confirmed'
            ) RETURNING id INTO v_order_id;
            
            -- Get the order code
            SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
        END IF;
    ELSE
        -- Create new order for non-quotation orders
        INSERT INTO orders (
            user_id,
            delivery_address,
            cart_items,
            total_amount,
            merchant_code,
            status
        ) VALUES (
            p_user_id,
            p_delivery_address,
            p_cart_items,
            p_total_amount,
            p_merchant_code,
            'confirmed'
        ) RETURNING id INTO v_order_id;
        
        -- Get the order code
        SELECT order_code INTO v_order_code FROM orders WHERE id = v_order_id;
    END IF;
    
    -- Create order_items for each item in the cart
    FOR v_item_data IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            unit_price
        ) VALUES (
            v_order_id,
            (v_item_data->>'id')::UUID,
            (v_item_data->>'quantity')::INTEGER,
            (v_item_data->>'price')::DECIMAL,
            (v_item_data->>'unit_price')::INTEGER
        ) RETURNING id INTO v_order_item_id;
    END LOOP;
    
    -- Return success with order details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order created/updated successfully',
        'order_id', v_order_id,
        'order_code', v_order_code,
        'updated', v_existing_order_id IS NOT NULL
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create/update order: ' || SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_or_update_simple_order TO authenticated;

-- ========================================
-- 5. VERIFY THE FIX
-- ========================================

-- Check that the problematic constraint is gone
SELECT 
    'CONSTRAINT CHECK' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE '%unique%parent%';

-- Check current orders for the problematic quotation
SELECT 
    'CURRENT ORDERS' as info,
    quotation_code,
    user_id,
    status,
    created_at,
    COUNT(*) as count
FROM orders 
WHERE quotation_code IS NOT NULL
GROUP BY quotation_code, user_id, status, created_at
ORDER BY created_at DESC;