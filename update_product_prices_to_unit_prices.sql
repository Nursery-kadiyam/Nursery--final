-- Update product_prices to unit_prices in quotations table
-- Run this in your Supabase SQL editor

-- Step 1: Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'product_prices'
ORDER BY ordinal_position;

-- Step 2: Rename the column from product_prices to unit_prices
ALTER TABLE quotations 
RENAME COLUMN product_prices TO unit_prices;

-- Step 3: Verify the column was renamed
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'unit_prices'
ORDER BY ordinal_position;

-- Step 4: Check if there are any existing quotations with product_prices data
SELECT 
    id,
    quotation_code,
    unit_prices,
    created_at
FROM quotations 
WHERE unit_prices IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- Step 5: Show all quotations to verify the change
SELECT 
    id,
    quotation_code,
    status,
    unit_prices,
    created_at
FROM quotations 
ORDER BY created_at DESC 
LIMIT 10;
