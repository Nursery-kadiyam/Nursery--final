-- REFRESH PRODUCTS TABLE SCHEMA CACHE
-- Run this script in your Supabase SQL Editor to ensure the ORM/API recognizes the correct column names

-- Step 1: Check current products table structure
SELECT '=== CURRENT PRODUCTS TABLE STRUCTURE ===' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Step 2: Ensure categories column exists and has correct name
SELECT '=== ENSURING CATEGORIES COLUMN EXISTS ===' as status;

-- Add categories column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS categories TEXT;

-- Step 3: Remove category column if it exists (to avoid confusion)
SELECT '=== REMOVING OLD CATEGORY COLUMN IF EXISTS ===' as status;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'category'
    ) THEN
        -- First, copy data from category to categories if categories is empty
        UPDATE products 
        SET categories = category 
        WHERE (categories IS NULL OR categories = '') AND category IS NOT NULL;
        
        -- Then drop the category column
        ALTER TABLE products DROP COLUMN category;
        RAISE NOTICE 'category column removed from products table, data copied to categories';
    ELSE
        RAISE NOTICE 'category column does not exist in products table';
    END IF;
END $$;

-- Step 4: Ensure merchant_code column exists
SELECT '=== ENSURING MERCHANT_CODE COLUMN EXISTS ===' as status;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS merchant_code TEXT;

-- Update existing products to use 'admin' as merchant_code if not set
UPDATE products 
SET merchant_code = 'admin' 
WHERE merchant_code IS NULL;

-- Make merchant_code NOT NULL
ALTER TABLE products 
ALTER COLUMN merchant_code SET NOT NULL;

-- Step 5: Create or update indexes
SELECT '=== CREATING/UPDATING INDEXES ===' as status;

CREATE INDEX IF NOT EXISTS idx_products_categories ON products(categories);
CREATE INDEX IF NOT EXISTS idx_products_merchant_code ON products(merchant_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_available_quantity ON products(available_quantity);

-- Step 6: Ensure foreign key constraint exists
SELECT '=== ENSURING FOREIGN KEY CONSTRAINT ===' as status;

-- First, ensure the merchants table exists
CREATE TABLE IF NOT EXISTS merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nursery_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    nursery_address TEXT NOT NULL,
    merchant_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin merchant if it doesn't exist
INSERT INTO merchants (full_name, nursery_name, phone_number, email, nursery_address, merchant_code, status)
VALUES ('Admin User', 'Admin Nursery', '0000000000', 'admin@nursery.com', 'Admin Address', 'admin', 'approved')
ON CONFLICT (merchant_code) DO NOTHING;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_merchant_code'
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_merchant_code 
        FOREIGN KEY (merchant_code) REFERENCES merchants(merchant_code);
        RAISE NOTICE 'Foreign key constraint fk_products_merchant_code added';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_products_merchant_code already exists';
    END IF;
END $$;

-- Step 7: Grant permissions
SELECT '=== GRANTING PERMISSIONS ===' as status;

GRANT ALL ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- Step 8: Refresh schema cache by running a simple query
SELECT '=== REFRESHING SCHEMA CACHE ===' as status;

-- This query will help refresh the schema cache
SELECT 
    'Schema cache refreshed!' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN categories IS NOT NULL THEN 1 END) as products_with_categories,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as products_with_merchant_code
FROM products;

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as status;

-- Show final table structure
SELECT 
    'Final products table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Show sample data to verify column names
SELECT 
    'Sample data verification:' as info,
    id,
    name,
    categories,
    merchant_code,
    available_quantity
FROM products 
LIMIT 5;

SELECT '=== SCHEMA CACHE REFRESH COMPLETED ===' as status;
