-- Add Order Splitting Schema to existing database
-- This script adds the necessary columns and tables for parent-child order splitting

-- 1. Add parent_order_id and merchant_id columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS merchant_id UUID;

-- 2. Create merchants table if it doesn't exist
CREATE TABLE IF NOT EXISTS merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nursery_name TEXT NOT NULL,
    merchant_code TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    email TEXT,
    nursery_address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add merchant_code to order_items table if not exists
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS merchant_code TEXT;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_code ON merchants(merchant_code);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant_code ON order_items(merchant_code);

-- 5. Enable RLS for merchants table
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for merchants
CREATE POLICY "Merchants can view own data" ON merchants
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view merchant basic info" ON merchants
    FOR SELECT USING (status = 'active');

-- 7. Grant permissions
GRANT ALL ON merchants TO authenticated;
GRANT SELECT ON merchants TO anon;

-- 8. Create function to update updated_at timestamp for merchants
CREATE OR REPLACE FUNCTION update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create trigger for merchants updated_at
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_merchants_updated_at();