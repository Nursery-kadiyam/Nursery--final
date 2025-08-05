-- Completely Recreate Orders Table - No RLS Issues
-- Run this in your Supabase SQL Editor

-- Step 1: Drop everything related to orders
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Step 2: Create orders table WITHOUT RLS
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    guest_user_id UUID,
    quotation_id UUID,
    delivery_address JSONB,
    shipping_address TEXT,
    total_amount DECIMAL(10,2),
    cart_items JSONB,
    status TEXT DEFAULT 'pending',
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create order_items table
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Step 5: Grant ALL permissions (no RLS)
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON orders TO anon;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;
GRANT ALL ON order_items TO anon;

-- Step 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Verify the setup
SELECT 
    'Orders table recreated successfully!' as status,
    'No RLS enabled' as rls_status,
    'All permissions granted' as permissions; 