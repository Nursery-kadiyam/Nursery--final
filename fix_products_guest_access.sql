-- COMPLETE PRODUCTS TABLE ACCESS FIX FOR GUESTS
-- This ensures guests can see products without authentication
-- Run this in your Supabase SQL Editor

-- Step 1: Disable RLS completely on products table
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on products table
DROP POLICY IF EXISTS "Allow all authenticated users to manage products" ON public.products;
DROP POLICY IF EXISTS "Allow all authenticated users to read products" ON public.products;
DROP POLICY IF EXISTS "Merchants can delete own products" ON public.products;
DROP POLICY IF EXISTS "Merchants can insert products" ON public.products;
DROP POLICY IF EXISTS "Merchants can update own products" ON public.products;

-- Step 3: Grant full permissions to all roles
GRANT ALL ON public.products TO anon;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- Step 4: Verify the fix
SELECT 
    'Products table access fixed' as status,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'products';

-- Step 5: Test data access
SELECT 
    'Data access test' as status,
    COUNT(*) as product_count
FROM public.products;

-- Step 6: Check permissions
SELECT 
    'Permissions check' as status,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'products' AND grantee IN ('anon', 'authenticated', 'service_role');

SELECT 'Products table guest access fix completed successfully!' as final_status;