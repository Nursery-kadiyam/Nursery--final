-- Verify Categories Column in Products Table
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. CHECK TABLE STRUCTURE
-- ========================================
SELECT '=== CHECKING PRODUCTS TABLE STRUCTURE ===' as section;

-- Check if products table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'products';

-- Check all columns in products table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFY CATEGORIES COLUMN
-- ========================================
SELECT '=== VERIFYING CATEGORIES COLUMN ===' as section;

-- Check if categories column exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('category', 'categories');

-- ========================================
-- 3. CHECK SAMPLE DATA
-- ========================================
SELECT '=== CHECKING SAMPLE DATA ===' as section;

-- Check recent products and their categories
SELECT 
    id,
    name,
    categories,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================
-- 4. COUNT PRODUCTS BY CATEGORY
-- ========================================
SELECT '=== PRODUCTS BY CATEGORY ===' as section;

SELECT 
    categories,
    COUNT(*) as product_count
FROM products 
WHERE categories IS NOT NULL
GROUP BY categories
ORDER BY product_count DESC;

-- ========================================
-- 5. UPDATE SCHEMA CACHE (if needed)
-- ========================================
SELECT '=== SCHEMA CACHE INFO ===' as section;

-- This will help refresh the schema cache
SELECT 
    'Schema cache refresh may be needed' as info,
    'Run this query to refresh: SELECT pg_stat_reset();' as action;

-- ========================================
-- 6. RLS POLICIES CHECK
-- ========================================
SELECT '=== CHECKING RLS POLICIES ===' as section;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'products';

-- ========================================
-- 7. SUMMARY
-- ========================================
SELECT '=== SUMMARY ===' as section;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'categories'
        ) THEN '✅ Categories column exists'
        ELSE '❌ Categories column NOT found'
    END as categories_column_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'category'
        ) THEN '⚠️ Category column (singular) also exists - may need cleanup'
        ELSE '✅ No category column (singular) found'
    END as category_column_status,
    
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE categories IS NOT NULL) as products_with_categories;
