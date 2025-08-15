-- Update Products Table Schema
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS categories TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 4.0,
ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bestseller BOOLEAN DEFAULT false;

-- Step 2: Enable RLS for products table (optional - for admin management)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for products
-- Allow public read access to products
DROP POLICY IF EXISTS "Public read access to products" ON products;
CREATE POLICY "Public read access to products" ON products
    FOR SELECT USING (true);

-- Allow authenticated users to read products
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
CREATE POLICY "Authenticated users can read products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role full access (for admin operations)
DROP POLICY IF EXISTS "Service role full access to products" ON products;
CREATE POLICY "Service role full access to products" ON products
    FOR ALL USING (auth.role() = 'service_role');

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_categories ON products(categories);
CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products(bestseller);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Step 5: Grant permissions
GRANT SELECT ON products TO anon;
GRANT SELECT ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- Step 6: Verify the schema update
SELECT 
    'Products table schema updated successfully!' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

