-- Fix Quotations Table ID Column
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT TABLE STRUCTURE
-- ========================================
SELECT '=== CHECKING CURRENT STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'id'
ORDER BY ordinal_position;

-- ========================================
-- 2. FIX ID COLUMN DEFAULT
-- ========================================
SELECT '=== FIXING ID COLUMN ===' as section;

-- Drop the existing id column constraint and recreate it with default
ALTER TABLE quotations 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'id';

-- ========================================
-- 3. TEST INSERT WITHOUT ID
-- ========================================
SELECT '=== TESTING INSERT ===' as section;

-- Test insert without specifying id (should use default)
DO $$
DECLARE
    first_merchant_code TEXT;
BEGIN
    SELECT merchant_code INTO first_merchant_code 
    FROM merchants 
    WHERE merchant_code IS NOT NULL 
    LIMIT 1;
    
    IF first_merchant_code IS NOT NULL THEN
        -- Insert a test quotation without specifying id
        INSERT INTO quotations (
            quotation_code,
            user_id,
            merchant_code,
            status,
            items,
            created_at
        ) VALUES (
            'TEST-Q-' || EXTRACT(EPOCH FROM NOW())::TEXT,
            'cdabf740-3adc-44b3-8a10-d7063e849816', -- Admin user ID
            first_merchant_code,
            'waiting_for_admin',
            '[{"product_id": "test-product", "quantity": 2, "price": 500.00}]',
            NOW()
        );
        
        RAISE NOTICE 'Test quotation created successfully with auto-generated ID';
    ELSE
        RAISE NOTICE 'No merchant codes found to create test quotation';
    END IF;
END $$;

-- ========================================
-- 4. VERIFY THE TEST INSERT
-- ========================================
SELECT '=== VERIFYING TEST INSERT ===' as section;

-- Check the latest quotation
SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    created_at
FROM quotations 
ORDER BY created_at DESC 
LIMIT 1;

SELECT 'ID column fix completed!' as status;
