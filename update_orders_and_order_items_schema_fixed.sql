-- UPDATE ORDERS AND ORDER_ITEMS TABLES WITH NEW SCHEMA (FIXED VERSION)
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. BACKUP EXISTING DATA
-- ========================================
SELECT '=== BACKING UP EXISTING DATA ===' as section;

-- Create backup tables
CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;
CREATE TABLE IF NOT EXISTS order_items_backup AS SELECT * FROM order_items;

SELECT 'Backup tables created successfully' as status;

-- ========================================
-- 2. DROP EXISTING TRIGGERS AND INDEXES
-- ========================================
SELECT '=== DROPPING EXISTING TRIGGERS AND INDEXES ===' as section;

-- Drop existing triggers on orders table
DROP TRIGGER IF EXISTS trigger_generate_ordnps_order_code ON orders;
DROP TRIGGER IF EXISTS trigger_generate_ordnps_order_code_with_date ON orders;

-- Drop existing triggers on order_items table
DROP TRIGGER IF EXISTS update_unit_price_trigger ON order_items;

-- Drop existing indexes on orders table
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_order_code;
DROP INDEX IF EXISTS idx_orders_quotation_code;
DROP INDEX IF EXISTS idx_orders_quotation_id;
DROP INDEX IF EXISTS idx_orders_guest_user_id;

-- Drop existing indexes on order_items table
DROP INDEX IF EXISTS idx_order_items_order_id;

-- ========================================
-- 3. DROP EXISTING TABLES
-- ========================================
SELECT '=== DROPPING EXISTING TABLES ===' as section;

-- Drop order_items first (due to foreign key constraint)
DROP TABLE IF EXISTS order_items CASCADE;

-- Drop orders table
DROP TABLE IF EXISTS orders CASCADE;

-- ========================================
-- 4. CREATE ORDERS TABLE WITH NEW SCHEMA
-- ========================================
SELECT '=== CREATING ORDERS TABLE ===' as section;

CREATE TABLE public.orders (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  delivery_address jsonb null,
  shipping_address text null,
  total_amount numeric(10, 2) null,
  cart_items jsonb null,
  status text null default 'pending'::text,
  razorpay_payment_id text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  order_code character varying(20) null,
  quotation_code character varying(255) null,
  constraint orders_pkey primary key (id),
  constraint orders_order_code_key unique (order_code)
) TABLESPACE pg_default;

-- ========================================
-- 5. CREATE ORDER_ITEMS TABLE WITH NEW SCHEMA
-- ========================================
SELECT '=== CREATING ORDER_ITEMS TABLE ===' as section;

CREATE TABLE public.order_items (
  id uuid not null default gen_random_uuid (),
  order_id uuid null,
  product_id uuid null,
  quantity integer not null,
  price numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  unit_prices text[] null,
  unit_price integer null,
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (id)
) TABLESPACE pg_default;

-- ========================================
-- 6. CREATE INDEXES
-- ========================================
SELECT '=== CREATING INDEXES ===' as section;

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders USING btree (order_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_orders_quotation_code ON public.orders USING btree (quotation_code) TABLESPACE pg_default;

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items USING btree (order_id) TABLESPACE pg_default;

-- ========================================
-- 7. RESTORE ORDERS DATA (SAFE VERSION)
-- ========================================
SELECT '=== RESTORING ORDERS DATA ===' as section;

-- Insert data from backup, only including columns that exist in backup
INSERT INTO orders (
    id,
    user_id,
    delivery_address,
    shipping_address,
    total_amount,
    cart_items,
    status,
    razorpay_payment_id,
    created_at,
    updated_at,
    quotation_code
)
SELECT 
    id,
    user_id,
    delivery_address,
    shipping_address,
    total_amount,
    cart_items,
    status,
    razorpay_payment_id,
    created_at,
    updated_at,
    -- Extract quotation_code from cart_items if it exists
    CASE 
        WHEN cart_items IS NOT NULL AND cart_items::text LIKE '%quotation_code%'
        THEN (cart_items->0->>'quotation_code')
        ELSE NULL
    END as quotation_code
FROM orders_backup;

SELECT 'Orders data restored successfully' as status;

-- ========================================
-- 8. RESTORE ORDER_ITEMS DATA (SAFE VERSION)
-- ========================================
SELECT '=== RESTORING ORDER_ITEMS DATA ===' as section;

-- Insert data from backup, only including columns that exist in backup
INSERT INTO order_items (
    id,
    order_id,
    product_id,
    quantity,
    price,
    created_at
)
SELECT 
    id,
    order_id,
    product_id,
    quantity,
    price,
    created_at
FROM order_items_backup;

SELECT 'Order items data restored successfully' as status;

-- ========================================
-- 9. CREATE TRIGGERS
-- ========================================
SELECT '=== CREATING TRIGGERS ===' as section;

-- Create the required functions if they don't exist
CREATE OR REPLACE FUNCTION generate_ordnps_order_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_code IS NULL THEN
        NEW.order_code := 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_ordnps_order_code_with_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_code IS NULL THEN
        NEW.order_code := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_unit_price()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.price::integer;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_generate_ordnps_order_code 
    BEFORE INSERT ON orders 
    FOR EACH ROW
    EXECUTE FUNCTION generate_ordnps_order_code();

CREATE TRIGGER trigger_generate_ordnps_order_code_with_date 
    BEFORE INSERT ON orders 
    FOR EACH ROW
    EXECUTE FUNCTION generate_ordnps_order_code_with_date();

CREATE TRIGGER update_unit_price_trigger 
    BEFORE INSERT OR UPDATE ON order_items 
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_price();

-- ========================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ========================================
SELECT '=== ENABLING ROW LEVEL SECURITY ===' as section;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 11. CREATE RLS POLICIES
-- ========================================
SELECT '=== CREATING RLS POLICIES ===' as section;

-- Orders table policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Order items table policies
CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert order items for their orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- ========================================
-- 12. VERIFICATION
-- ========================================
SELECT '=== VERIFICATION ===' as section;

-- Check orders table structure
SELECT 'Orders table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Check order_items table structure
SELECT 'Order items table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Check data counts
SELECT 'Data verification:' as info;
SELECT 
    'Orders count' as metric,
    COUNT(*) as value
FROM orders
UNION ALL
SELECT 
    'Order items count' as metric,
    COUNT(*) as value
FROM order_items
UNION ALL
SELECT 
    'Orders with quotation_code' as metric,
    COUNT(*) as value
FROM orders
WHERE quotation_code IS NOT NULL;

-- ========================================
-- 13. CLEANUP (OPTIONAL)
-- ========================================
SELECT '=== CLEANUP ===' as section;

-- Uncomment the following lines if you want to remove backup tables
-- DROP TABLE IF EXISTS orders_backup;
-- DROP TABLE IF EXISTS order_items_backup;

SELECT 'Schema update completed successfully!' as status;
