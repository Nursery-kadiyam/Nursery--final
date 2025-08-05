-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create guest_users table for guest checkout
CREATE TABLE IF NOT EXISTS guest_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delivery_address JSONB,
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for guest_users
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access for guest users (no authentication required)
CREATE POLICY "Public access for guest users" ON guest_users
    FOR ALL USING (true);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_user_id UUID REFERENCES guest_users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delivery_address JSONB NOT NULL,
    shipping_address TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    cart_items JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Create policy to allow users to insert their own orders
CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Create policy to allow users to update their own orders
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_users_updated_at 
    BEFORE UPDATE ON guest_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone); 
CREATE INDEX IF NOT EXISTS idx_guest_users_phone ON guest_users(phone);
CREATE INDEX IF NOT EXISTS idx_guest_users_user_id ON guest_users(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- If the table already exists and order_id is not UUID, alter it:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='order_id' AND data_type <> 'uuid') THEN
    ALTER TABLE order_items ALTER COLUMN order_id TYPE UUID USING order_id::uuid;
  END IF;
END $$;

-- Drop and recreate the foreign key constraint if needed
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Ensure product_id is also UUID and references products(id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_id' AND data_type <> 'uuid') THEN
    ALTER TABLE order_items ALTER COLUMN product_id TYPE UUID USING product_id::uuid;
  END IF;
END $$;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- Remove email column from guest_users table
ALTER TABLE guest_users
DROP COLUMN email; 