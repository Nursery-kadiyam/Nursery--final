-- Fix Orders Table Foreign Key Constraint Issue
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing orders table if it exists (this will delete all orders)
DROP TABLE IF EXISTS orders CASCADE;

-- Step 2: Create orders table with proper foreign key constraints
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_user_id UUID REFERENCES guest_users(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    delivery_address JSONB,
    shipping_address TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    cart_items JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Policy for users to view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Policy for users to insert their own orders
CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Policy for users to update their own orders
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Step 6: Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

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

-- Step 10: Verify the setup
SELECT 'Orders table created successfully!' as status; 