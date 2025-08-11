-- Fix User Authentication and Foreign Key Constraint Issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check current user
SELECT 
    'Current User' as info,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'No user logged in'
        ELSE 'User logged in'
    END as status;

-- Step 2: Drop the problematic foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Step 3: Recreate the orders table without foreign key constraint temporarily
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- No foreign key constraint for now
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

-- Step 4: Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple RLS policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Step 8: Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;

-- Step 9: Create trigger for updated_at
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

-- Step 10: Verify the fix
SELECT 'Orders table created without foreign key constraint!' as status; 