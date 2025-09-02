-- Setup tables for enhanced Merchant Dashboard
-- This script creates the necessary tables for orders, reviews, and analytics

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_code TEXT NOT NULL,
    merchant_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    items JSONB,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_address JSONB,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add merchant_code column to products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'merchant_code') THEN
        ALTER TABLE products ADD COLUMN merchant_code TEXT;
    END IF;
END $$;

-- Add merchant_code column to orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_code') THEN
        ALTER TABLE orders ADD COLUMN merchant_code TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant_code ON reviews(merchant_code);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_products_merchant_code ON products(merchant_code);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Merchants can view their own orders" ON orders
    FOR SELECT USING (merchant_code = current_setting('app.merchant_code', true));

CREATE POLICY "Merchants can update their own orders" ON orders
    FOR UPDATE USING (merchant_code = current_setting('app.merchant_code', true));

-- Create RLS policies for reviews
CREATE POLICY "Merchants can view reviews for their business" ON reviews
    FOR SELECT USING (merchant_code = current_setting('app.merchant_code', true));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for orders table
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- INSERT INTO orders (quotation_code, merchant_code, user_id, total_amount, status) 
-- VALUES ('Q123', 'MERCHANT001', 'user-uuid', 1500.00, 'delivered');

-- INSERT INTO reviews (merchant_code, user_id, rating, comment, customer_name)
-- VALUES ('MERCHANT001', 'user-uuid', 5, 'Great service and quality plants!', 'John Doe');
