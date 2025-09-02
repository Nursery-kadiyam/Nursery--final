-- Setup Missing Tables for Enhanced Merchant Dashboard
-- Since orders table already exists, this script only creates missing tables

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NULL,
    order_id UUID REFERENCES orders(id) NULL,
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
        RAISE NOTICE 'Added merchant_code column to products table';
    ELSE
        RAISE NOTICE 'merchant_code column already exists in products table';
    END IF;
END $$;

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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant_code ON reviews(merchant_code);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_products_merchant_code ON products(merchant_code);

-- Enable Row Level Security on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reviews
CREATE POLICY "Merchants can view reviews for their business" ON reviews
    FOR SELECT USING (merchant_code = current_setting('app.merchant_code', true));

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for orders table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
        CREATE TRIGGER update_orders_updated_at 
            BEFORE UPDATE ON orders 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update_orders_updated_at trigger';
    ELSE
        RAISE NOTICE 'update_orders_updated_at trigger already exists';
    END IF;
END $$;

-- Insert sample data for testing (only if tables are empty)
-- Note: We'll insert sample data without user_id to avoid foreign key constraint issues
INSERT INTO orders (quotation_code, merchant_code, total_amount, status) 
SELECT 'Q123', 'MC-2025-0002', 1500.00, 'delivered'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE quotation_code = 'Q123');

INSERT INTO reviews (merchant_code, rating, comment, customer_name)
SELECT 'MC-2025-0002', 5, 'Great service and quality plants!', 'John Doe'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE merchant_code = 'MC-2025-0002' AND customer_name = 'John Doe');

-- Show current table status
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'orders' THEN '✅ Exists'
        WHEN table_name = 'reviews' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN '✅ Created'
        WHEN table_name = 'reviews' THEN '❌ Missing'
        ELSE 'Unknown'
    END as status
FROM (VALUES ('orders'), ('reviews')) as t(table_name);
