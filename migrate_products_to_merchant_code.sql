-- MIGRATE PRODUCTS TABLE FROM MERCHANT_EMAIL TO MERCHANT_CODE
-- Run this script in your Supabase SQL Editor

-- Step 1: Check current products table structure
SELECT '=== CHECKING CURRENT PRODUCTS TABLE STRUCTURE ===' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Step 2: Add merchant_code column to products table
SELECT '=== ADDING MERCHANT_CODE COLUMN ===' as status;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS merchant_code TEXT;

-- Step 3: Update existing products to use 'admin' as merchant_code
SELECT '=== UPDATING EXISTING PRODUCTS TO USE ADMIN MERCHANT_CODE ===' as status;

UPDATE products 
SET merchant_code = 'admin' 
WHERE merchant_code IS NULL;

-- Step 4: Make merchant_code NOT NULL after setting default values
SELECT '=== MAKING MERCHANT_CODE NOT NULL ===' as status;

ALTER TABLE products 
ALTER COLUMN merchant_code SET NOT NULL;

-- Step 5: Add foreign key constraint to merchants table
SELECT '=== ADDING FOREIGN KEY CONSTRAINT ===' as status;

-- First, ensure the merchants table exists and has merchant_code column
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

-- Add foreign key constraint
ALTER TABLE products 
ADD CONSTRAINT fk_products_merchant_code 
FOREIGN KEY (merchant_code) REFERENCES merchants(merchant_code);

-- Step 6: Remove merchant_email column if it exists
SELECT '=== REMOVING MERCHANT_EMAIL COLUMN ===' as status;

-- Check if merchant_email column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'merchant_email'
    ) THEN
        ALTER TABLE products DROP COLUMN merchant_email;
        RAISE NOTICE 'merchant_email column removed from products table';
    ELSE
        RAISE NOTICE 'merchant_email column does not exist in products table';
    END IF;
END $$;

-- Step 7: Create indexes for better performance
SELECT '=== CREATING INDEXES ===' as status;

CREATE INDEX IF NOT EXISTS idx_products_merchant_code ON products(merchant_code);

-- Step 8: Update RLS policies to use merchant_code
SELECT '=== UPDATING RLS POLICIES ===' as status;

-- Drop existing policies that might reference merchant_email
DROP POLICY IF EXISTS "Merchants can insert products" ON products;
DROP POLICY IF EXISTS "Merchants can update own products" ON products;
DROP POLICY IF EXISTS "Merchants can delete own products" ON products;

-- Create new policies using merchant_code
CREATE POLICY "Merchants can insert products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchant_code = products.merchant_code 
            AND user_id = auth.uid() 
            AND status = 'approved'
        )
    );

CREATE POLICY "Merchants can update own products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchant_code = products.merchant_code 
            AND user_id = auth.uid() 
            AND status = 'approved'
        )
    );

CREATE POLICY "Merchants can delete own products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchant_code = products.merchant_code 
            AND user_id = auth.uid() 
            AND status = 'approved'
        )
    );

-- Step 9: Grant permissions
SELECT '=== GRANTING PERMISSIONS ===' as status;

GRANT ALL ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- Step 10: Verify the migration
SELECT '=== VERIFICATION ===' as status;

-- Check final table structure
SELECT 
    'Final products table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Check that all products have merchant_code
SELECT 
    'Products with merchant_code:' as info,
    COUNT(*) as total_products,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as products_with_merchant_code,
    COUNT(CASE WHEN merchant_code = 'admin' THEN 1 END) as admin_products
FROM products;

-- Check foreign key constraint
SELECT 
    'Foreign key constraint status:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'products'
AND kcu.column_name = 'merchant_code';

SELECT '=== MIGRATION COMPLETED SUCCESSFULLY ===' as status;
