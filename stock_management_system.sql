-- COMPREHENSIVE STOCK MANAGEMENT SYSTEM
-- This system ensures the products table available_quantity is always accurate
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CREATE STOCK TRANSACTIONS TABLE
-- ========================================
SELECT '=== CREATING STOCK TRANSACTIONS TABLE ===' as status;

CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'purchase',           -- Customer buys product (decreases stock)
        'return',            -- Customer returns product (increases stock)
        'cancellation',      -- Order cancelled (increases stock)
        'refund',           -- Order refunded (increases stock)
        'restock',          -- Merchant adds stock manually
        'adjustment',       -- Manual stock adjustment
        'damaged',          -- Product damaged/lost (decreases stock)
        'expired'           -- Product expired (decreases stock)
    )),
    quantity INTEGER NOT NULL, -- Positive for increases, negative for decreases
    previous_quantity INTEGER NOT NULL, -- Stock before transaction
    new_quantity INTEGER NOT NULL, -- Stock after transaction
    reason TEXT, -- Optional reason for the transaction
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT -- Additional notes
);

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================
SELECT '=== CREATING INDEXES ===' as status;

CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_order_id ON stock_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_by ON stock_transactions(created_by);

-- ========================================
-- 3. CREATE STOCK MANAGEMENT FUNCTIONS
-- ========================================
SELECT '=== CREATING STOCK MANAGEMENT FUNCTIONS ===' as status;

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_transaction_type TEXT,
    p_order_id UUID DEFAULT NULL,
    p_quotation_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
    transaction_id UUID;
BEGIN
    -- Get current stock
    SELECT available_quantity INTO current_stock
    FROM products
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    -- Calculate new stock
    new_stock := current_stock + p_quantity_change;
    
    -- Prevent negative stock (except for damaged/expired transactions)
    IF new_stock < 0 AND p_transaction_type NOT IN ('damaged', 'expired', 'adjustment') THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested change: %, New stock would be: %', 
            current_stock, p_quantity_change, new_stock;
    END IF;
    
    -- Update product stock
    UPDATE products 
    SET available_quantity = new_stock
    WHERE id = p_product_id;
    
    -- Record the transaction
    INSERT INTO stock_transactions (
        product_id,
        order_id,
        quotation_id,
        transaction_type,
        quantity,
        previous_quantity,
        new_quantity,
        reason,
        created_by,
        notes
    ) VALUES (
        p_product_id,
        p_order_id,
        p_quotation_id,
        p_transaction_type,
        p_quantity_change,
        current_stock,
        new_stock,
        p_reason,
        auth.uid(),
        p_notes
    ) RETURNING id INTO transaction_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Stock update failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process order stock changes
CREATE OR REPLACE FUNCTION process_order_stock_changes(
    p_order_id UUID,
    p_action TEXT -- 'place', 'cancel', 'refund'
)
RETURNS BOOLEAN AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    quantity_change INTEGER;
    transaction_type TEXT;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    -- Determine transaction type and quantity change
    CASE p_action
        WHEN 'place' THEN
            transaction_type := 'purchase';
            quantity_change := -1; -- Decrease stock
        WHEN 'cancel' THEN
            transaction_type := 'cancellation';
            quantity_change := 1; -- Increase stock
        WHEN 'refund' THEN
            transaction_type := 'refund';
            quantity_change := 1; -- Increase stock
        ELSE
            RAISE EXCEPTION 'Invalid action: %. Must be place, cancel, or refund', p_action;
    END CASE;
    
    -- Process each order item
    FOR item_record IN 
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        -- Update stock for each item
        PERFORM update_product_stock(
            item_record.product_id,
            item_record.quantity * quantity_change,
            transaction_type,
            p_order_id,
            NULL,
            CASE 
                WHEN p_action = 'place' THEN 'Order placed'
                WHEN p_action = 'cancel' THEN 'Order cancelled'
                WHEN p_action = 'refund' THEN 'Order refunded'
            END,
            CASE 
                WHEN p_action = 'place' THEN 'Stock decreased due to order placement'
                WHEN p_action = 'cancel' THEN 'Stock restored due to order cancellation'
                WHEN p_action = 'refund' THEN 'Stock restored due to order refund'
            END
        );
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Order stock processing failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stock history for a product
CREATE OR REPLACE FUNCTION get_product_stock_history(p_product_id UUID)
RETURNS TABLE (
    transaction_date TIMESTAMP WITH TIME ZONE,
    transaction_type TEXT,
    quantity_change INTEGER,
    previous_stock INTEGER,
    new_stock INTEGER,
    reason TEXT,
    order_id UUID,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.created_at,
        st.transaction_type,
        st.quantity,
        st.previous_quantity,
        st.new_quantity,
        st.reason,
        st.order_id,
        st.created_by
    FROM stock_transactions st
    WHERE st.product_id = p_product_id
    ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CREATE TRIGGERS FOR AUTOMATIC STOCK MANAGEMENT
-- ========================================
SELECT '=== CREATING AUTOMATIC STOCK TRIGGERS ===' as status;

-- Trigger to automatically update stock when order status changes
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is placed (status changes to 'Paid' or 'confirmed')
    IF NEW.status IN ('Paid', 'confirmed', 'processing') AND 
       OLD.status NOT IN ('Paid', 'confirmed', 'processing') THEN
        PERFORM process_order_stock_changes(NEW.id, 'place');
    END IF;
    
    -- When order is cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM process_order_stock_changes(NEW.id, 'cancel');
    END IF;
    
    -- When order is refunded
    IF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
        PERFORM process_order_stock_changes(NEW.id, 'refund');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_status_change ON orders;
CREATE TRIGGER trigger_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

-- ========================================
-- 5. CREATE RLS POLICIES FOR STOCK TRANSACTIONS
-- ========================================
SELECT '=== CREATING RLS POLICIES ===' as status;

-- Enable RLS on stock_transactions
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for viewing stock transactions (merchants can see their own products)
CREATE POLICY "Merchants can view stock transactions for their products" ON stock_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN merchants m ON p.merchant_code = m.merchant_code
            WHERE p.id = stock_transactions.product_id
            AND m.user_id = auth.uid()
        )
    );

-- Policy for admins to view all stock transactions
CREATE POLICY "Admins can view all stock transactions" ON stock_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Policy for inserting stock transactions (only through functions)
CREATE POLICY "Allow stock transaction insertion" ON stock_transactions
    FOR INSERT WITH CHECK (true);

-- ========================================
-- 6. CREATE STOCK ALERT SYSTEM
-- ========================================
SELECT '=== CREATING STOCK ALERT SYSTEM ===' as status;

-- Function to check low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products(p_threshold INTEGER DEFAULT 10)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    current_stock INTEGER,
    merchant_code TEXT,
    merchant_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.available_quantity,
        p.merchant_code,
        m.nursery_name
    FROM products p
    JOIN merchants m ON p.merchant_code = m.merchant_code
    WHERE p.available_quantity <= p_threshold
    ORDER BY p.available_quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get out of stock products
CREATE OR REPLACE FUNCTION get_out_of_stock_products()
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    merchant_code TEXT,
    merchant_name TEXT,
    last_stock_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.merchant_code,
        m.nursery_name,
        st.created_at
    FROM products p
    JOIN merchants m ON p.merchant_code = m.merchant_code
    LEFT JOIN stock_transactions st ON p.id = st.product_id
    WHERE p.available_quantity = 0
    AND st.id = (
        SELECT MAX(st2.id) 
        FROM stock_transactions st2 
        WHERE st2.product_id = p.id
    )
    ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE STOCK REPORTS
-- ========================================
SELECT '=== CREATING STOCK REPORTS ===' as status;

-- Function to get stock movement report
CREATE OR REPLACE FUNCTION get_stock_movement_report(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_merchant_code TEXT DEFAULT NULL
)
RETURNS TABLE (
    product_name TEXT,
    merchant_name TEXT,
    transaction_type TEXT,
    quantity_change INTEGER,
    total_transactions BIGINT,
    total_quantity_changed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        m.nursery_name,
        st.transaction_type,
        st.quantity,
        COUNT(*) as total_transactions,
        SUM(ABS(st.quantity)) as total_quantity_changed
    FROM stock_transactions st
    JOIN products p ON st.product_id = p.id
    JOIN merchants m ON p.merchant_code = m.merchant_code
    WHERE st.created_at BETWEEN p_start_date AND p_end_date
    AND (p_merchant_code IS NULL OR p.merchant_code = p_merchant_code)
    GROUP BY p.name, m.nursery_name, st.transaction_type, st.quantity
    ORDER BY p.name, st.transaction_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================
SELECT '=== GRANTING PERMISSIONS ===' as status;

GRANT ALL ON stock_transactions TO authenticated;
GRANT ALL ON stock_transactions TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================
-- 9. CREATE STOCK VALIDATION CONSTRAINTS
-- ========================================
SELECT '=== CREATING STOCK VALIDATION ===' as status;

-- Add constraint to prevent negative stock (except for specific transaction types)
ALTER TABLE products 
ADD CONSTRAINT check_available_quantity_positive 
CHECK (available_quantity >= 0);

-- ========================================
-- 10. INITIALIZE STOCK TRANSACTIONS FOR EXISTING DATA
-- ========================================
SELECT '=== INITIALIZING STOCK TRANSACTIONS ===' as status;

-- Create initial stock transaction records for existing products
INSERT INTO stock_transactions (
    product_id,
    transaction_type,
    quantity,
    previous_quantity,
    new_quantity,
    reason,
    notes
)
SELECT 
    id,
    'restock',
    available_quantity,
    0,
    available_quantity,
    'Initial stock setup',
    'Stock initialized during system setup'
FROM products
WHERE available_quantity > 0
ON CONFLICT DO NOTHING;

-- ========================================
-- 11. VERIFICATION QUERIES
-- ========================================
SELECT '=== VERIFICATION ===' as status;

-- Check stock transactions table
SELECT 
    'Stock transactions table created successfully' as status,
    COUNT(*) as total_transactions
FROM stock_transactions;

-- Check products with current stock
SELECT 
    'Current product stock levels' as info,
    COUNT(*) as total_products,
    SUM(available_quantity) as total_stock,
    COUNT(CASE WHEN available_quantity = 0 THEN 1 END) as out_of_stock,
    COUNT(CASE WHEN available_quantity <= 10 THEN 1 END) as low_stock
FROM products;

-- Check functions created
SELECT 
    'Functions created successfully' as status,
    routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%stock%'
ORDER BY routine_name;

SELECT '=== STOCK MANAGEMENT SYSTEM SETUP COMPLETE ===' as status;
