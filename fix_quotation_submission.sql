-- Fix Quotation Submission Issue
-- Run this in your Supabase SQL editor

-- Step 1: Check if product_prices column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name IN ('product_prices', 'unit_prices')
ORDER BY column_name;

-- Step 2: If product_prices exists, rename it to unit_prices
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' 
        AND column_name = 'product_prices'
    ) THEN
        ALTER TABLE quotations RENAME COLUMN product_prices TO unit_prices;
        RAISE NOTICE 'Column product_prices renamed to unit_prices';
    ELSE
        RAISE NOTICE 'Column product_prices does not exist';
    END IF;
END $$;

-- Step 3: If unit_prices column doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' 
        AND column_name = 'unit_prices'
    ) THEN
        ALTER TABLE quotations ADD COLUMN unit_prices JSONB;
        RAISE NOTICE 'Column unit_prices created';
    ELSE
        RAISE NOTICE 'Column unit_prices already exists';
    END IF;
END $$;

-- Step 4: Verify the column structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'unit_prices';

-- Step 5: Check RLS policies for quotations table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'quotations';

-- Step 6: Create RLS policy for merchants to insert quotations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quotations' 
        AND policyname = 'Merchants can insert quotations'
    ) THEN
        CREATE POLICY "Merchants can insert quotations" ON quotations
            FOR INSERT WITH CHECK (true);
        RAISE NOTICE 'RLS policy for merchants to insert quotations created';
    ELSE
        RAISE NOTICE 'RLS policy for merchants to insert quotations already exists';
    END IF;
END $$;

-- Step 7: Show sample quotations to verify structure
SELECT 
    id,
    quotation_code,
    status,
    unit_prices,
    created_at
FROM quotations 
ORDER BY created_at DESC 
LIMIT 5;
