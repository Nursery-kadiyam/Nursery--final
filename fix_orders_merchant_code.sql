-- MULTI-MERCHANT ORDER MANAGEMENT SYSTEM
-- This script implements a complete order management system for multiple merchants
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. ENHANCE ORDERS TABLE STRUCTURE
-- ========================================

-- Add merchant_code column to orders table if it doesn't exist
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

-- Add quotation_code column if it doesn't exist
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

-- Add order_status column for detailed status tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'order_status') THEN
        ALTER TABLE orders ADD COLUMN order_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added order_status column to orders table';
    ELSE
        RAISE NOTICE 'order_status column already exists in orders table';
    END IF;
END $$;

-- Add delivery_status column for merchant management
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_status') THEN
        ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added delivery_status column to orders table';
    ELSE
        RAISE NOTICE 'delivery_status column already exists in orders table';
    END IF;
END $$;

-- Add customer_details column for user information
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'customer_details') THEN
        ALTER TABLE orders ADD COLUMN customer_details JSONB;
        RAISE NOTICE 'Added customer_details column to orders table';
    ELSE
        RAISE NOTICE 'customer_details column already exists in orders table';
    END IF;
END $$;

-- ========================================
-- 2. ENHANCE EXISTING ORDER_ITEMS TABLE
-- ========================================

-- Add merchant_code column to existing order_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'merchant_code') THEN
        ALTER TABLE order_items ADD COLUMN merchant_code TEXT;
        RAISE NOTICE 'Added merchant_code column to existing order_items table';
    ELSE
        RAISE NOTICE 'merchant_code column already exists in order_items table';
    END IF;
END $$;

-- Add unit_price column if it doesn't exist (some tables might have 'price' instead)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'unit_price') THEN
        -- Check if 'price' column exists and rename it to 'unit_price'
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'price') THEN
            ALTER TABLE order_items RENAME COLUMN price TO unit_price;
            RAISE NOTICE 'Renamed price column to unit_price in order_items table';
        ELSE
            ALTER TABLE order_items ADD COLUMN unit_price DECIMAL(10,2);
            RAISE NOTICE 'Added unit_price column to order_items table';
        END IF;
    ELSE
        RAISE NOTICE 'unit_price column already exists in order_items table';
    END IF;
END $$;

-- Add total_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE order_items ADD COLUMN total_price DECIMAL(10,2);
        RAISE NOTICE 'Added total_price column to order_items table';
    ELSE
        RAISE NOTICE 'total_price column already exists in order_items table';
    END IF;
END $$;

-- ========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_code ON orders(quotation_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant_code ON order_items(merchant_code);

-- ========================================
-- 4. CREATE FUNCTIONS FOR ORDER MANAGEMENT
-- ========================================

-- Function to create orders from quotations
CREATE OR REPLACE FUNCTION create_order_from_quotations(
    p_user_id UUID,
    p_quotation_code TEXT,
    p_selected_merchants JSONB,
    p_delivery_address JSONB,
    p_shipping_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_merchant_code TEXT;
    v_merchant_data JSONB;
    v_total_amount DECIMAL(10,2) := 0;
    v_result JSONB;
    v_quotation RECORD;
    v_order_ids UUID[] := '{}';
BEGIN
    -- Get the original quotation
    SELECT * INTO v_quotation 
    FROM quotations 
    WHERE quotation_code = p_quotation_code 
    AND is_user_request = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Quotation not found'
        );
    END IF;
    
    -- Process each selected merchant - create ONE order per merchant
    FOR v_merchant_data IN SELECT * FROM jsonb_array_elements(p_selected_merchants)
    LOOP
        v_merchant_code := v_merchant_data->>'merchant_code';
        
        -- Create ONLY merchant-specific order (no duplicate main order)
        INSERT INTO orders (
            user_id,
            quotation_code,
            merchant_code,
            delivery_address,
            shipping_address,
            total_amount,
            cart_items,
            status,
            order_status,
            delivery_status,
            customer_details,
            created_at
        ) VALUES (
            p_user_id,
            p_quotation_code,
            v_merchant_code,
            p_delivery_address,
            p_shipping_address,
            (v_merchant_data->>'total_price')::DECIMAL,
            v_merchant_data->'items',
            'confirmed',
            'pending',
            'pending',
            jsonb_build_object(
                'email', (SELECT email FROM auth.users WHERE id = p_user_id),
                'phone', (SELECT phone FROM user_profiles WHERE user_id = p_user_id)
            ),
            NOW()
        ) RETURNING id INTO v_order_id;
        
        -- Add order items for this merchant to existing order_items table
        INSERT INTO order_items (
            order_id,
            product_id,
            merchant_code,
            quantity,
            unit_price,
            total_price
        )
        SELECT 
            v_order_id, -- Use the actual order ID
            (item->>'product_id')::UUID,
            v_merchant_code, -- Use the merchant code
            (item->>'quantity')::INTEGER,
            (item->>'unit_price')::DECIMAL,
            (item->>'total_price')::DECIMAL
        FROM jsonb_array_elements(v_merchant_data->'items') AS item;
        
        -- Store order ID for return
        v_order_ids := array_append(v_order_ids, v_order_id);
        v_total_amount := v_total_amount + (v_merchant_data->>'total_price')::DECIMAL;
    END LOOP;
    
    -- Mark quotation as order placed
    UPDATE quotations 
    SET order_placed_at = NOW() 
    WHERE quotation_code = p_quotation_code;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_ids', v_order_ids,
        'total_amount', v_total_amount,
        'message', 'Orders created successfully for each merchant'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create orders: ' || SQLERRM
        );
END;
$$;

-- Function to update order delivery status (for merchants)
CREATE OR REPLACE FUNCTION update_order_delivery_status(
    p_order_id UUID,
    p_merchant_code TEXT,
    p_delivery_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update the order status
UPDATE orders 
    SET 
        delivery_status = p_delivery_status,
        updated_at = NOW()
    WHERE id = p_order_id 
    AND merchant_code = p_merchant_code;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order status updated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found or access denied'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to update order status: ' || SQLERRM
        );
END;
$$;

-- Function to get merchant orders
CREATE OR REPLACE FUNCTION get_merchant_orders(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    quotation_code TEXT,
    user_email TEXT,
    customer_name TEXT,
    items JSONB,
    total_amount DECIMAL(10,2),
    order_status TEXT,
    delivery_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.quotation_code,
        o.customer_details->>'email' as user_email,
        CONCAT(
            COALESCE(up.first_name, ''),
            ' ',
            COALESCE(up.last_name, '')
        ) as customer_name,
        o.cart_items,
        o.total_amount,
        o.order_status,
        o.delivery_status,
        o.created_at,
        o.customer_details->>'phone' as customer_phone
    FROM orders o
    LEFT JOIN user_profiles up ON o.user_id = up.user_id
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Function to get all orders for admin
CREATE OR REPLACE FUNCTION get_all_orders_admin()
RETURNS TABLE (
    order_id UUID,
    quotation_code TEXT,
    merchant_code TEXT,
    user_email TEXT,
    customer_name TEXT,
    items JSONB,
    total_amount DECIMAL(10,2),
    order_status TEXT,
    delivery_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.quotation_code,
        o.merchant_code,
        o.customer_details->>'email' as user_email,
        CONCAT(
            COALESCE(up.first_name, ''),
            ' ',
            COALESCE(up.last_name, '')
        ) as customer_name,
        o.cart_items,
        o.total_amount,
        o.order_status,
        o.delivery_status,
        o.created_at,
        o.customer_details->>'phone' as customer_phone
    FROM orders o
    LEFT JOIN user_profiles up ON o.user_id = up.user_id
    WHERE o.merchant_code IS NOT NULL
    ORDER BY o.created_at DESC;
END;
$$;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION create_order_from_quotations(UUID, TEXT, JSONB, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_delivery_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_admin() TO authenticated;

-- ========================================
-- 6. CREATE RLS POLICIES (SAFELY - NO DROPPING)
-- ========================================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Check existing policies and create only if they don't exist
DO $$
BEGIN
    -- Policy for users to view their own orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can view own orders'
    ) THEN
        CREATE POLICY "Users can view own orders" ON orders
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can view own orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view own orders';
    END IF;

    -- Policy for merchants to view their orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Merchants can view their orders'
    ) THEN
        CREATE POLICY "Merchants can view their orders" ON orders
            FOR SELECT USING (
                merchant_code = (
                    SELECT merchant_code FROM user_profiles 
                    WHERE user_id = auth.uid()
                )
            );
        RAISE NOTICE 'Created policy: Merchants can view their orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Merchants can view their orders';
    END IF;

    -- Policy for merchants to update their orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Merchants can update their orders'
    ) THEN
        CREATE POLICY "Merchants can update their orders" ON orders
            FOR UPDATE USING (
                merchant_code = (
                    SELECT merchant_code FROM user_profiles 
                    WHERE user_id = auth.uid()
                )
            );
        RAISE NOTICE 'Created policy: Merchants can update their orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Merchants can update their orders';
    END IF;

    -- Policy for admin to view all orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Admin can view all orders'
    ) THEN
        CREATE POLICY "Admin can view all orders" ON orders
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
        RAISE NOTICE 'Created policy: Admin can view all orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Admin can view all orders';
    END IF;

END $$;

-- ========================================
-- 7. VERIFICATION AND TESTING
-- ========================================

-- Show current table status
SELECT 
    'Orders table enhanced successfully!' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'merchant_code') 
        THEN '✅ merchant_code column exists'
        ELSE '❌ merchant_code column missing'
    END as merchant_code_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'quotation_code') 
        THEN '✅ quotation_code column exists'
        ELSE '❌ quotation_code column missing'
    END as quotation_code_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'order_status') 
        THEN '✅ order_status column exists'
        ELSE '❌ order_status column missing'
    END as order_status_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'delivery_status') 
        THEN '✅ delivery_status column exists'
        ELSE '❌ delivery_status column missing'
    END as delivery_status_status,
    COUNT(*) as total_orders
FROM orders;

-- Show order_items table status
SELECT 
    'Order Items table enhanced successfully!' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'order_items' AND column_name = 'merchant_code') 
        THEN '✅ merchant_code column exists'
        ELSE '❌ merchant_code column missing'
    END as merchant_code_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'order_items' AND column_name = 'unit_price') 
        THEN '✅ unit_price column exists'
        ELSE '❌ unit_price column missing'
    END as unit_price_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'order_items' AND column_name = 'total_price') 
        THEN '✅ total_price column exists'
        ELSE '❌ total_price column missing'
    END as total_price_status,
    COUNT(*) as total_items
FROM order_items;

-- Show created functions
SELECT 
    'Functions created successfully!' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'create_order_from_quotations',
    'update_order_delivery_status',
    'get_merchant_orders',
    'get_all_orders_admin'
)
ORDER BY routine_name;
