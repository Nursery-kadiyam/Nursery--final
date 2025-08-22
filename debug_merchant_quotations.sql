-- Debug Merchant Quotations
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CHECK ALL QUOTATIONS
-- ========================================
SELECT '=== ALL QUOTATIONS ===' as section;

SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    created_at,
    updated_at
FROM quotations 
ORDER BY created_at DESC;

-- ========================================
-- 2. CHECK MERCHANT CODES
-- ========================================
SELECT '=== MERCHANT CODES ===' as section;

SELECT 
    merchant_code,
    COUNT(*) as quotation_count
FROM quotations 
WHERE merchant_code IS NOT NULL
GROUP BY merchant_code;

-- ========================================
-- 3. CHECK QUOTATION STATUSES
-- ========================================
SELECT '=== QUOTATION STATUSES ===' as section;

SELECT 
    status,
    COUNT(*) as count
FROM quotations 
GROUP BY status
ORDER BY count DESC;

-- ========================================
-- 4. CHECK MERCHANTS TABLE
-- ========================================
SELECT '=== MERCHANTS TABLE ===' as section;

SELECT 
    id,
    merchant_code,
    email,
    status,
    created_at
FROM merchants 
ORDER BY created_at DESC;

-- ========================================
-- 5. TEST MERCHANT QUOTATIONS QUERY
-- ========================================
SELECT '=== TEST MERCHANT QUOTATIONS QUERY ===' as section;

-- Replace 'YOUR_MERCHANT_CODE' with the actual merchant code from step 2
-- This simulates the query from the merchant dashboard

-- Example: If merchant code is 'MC001', run:
-- SELECT * FROM quotations WHERE merchant_code = 'MC001' AND status IN ('waiting_for_admin', 'approved', 'rejected', 'closed');

-- For now, let's check all quotations with merchant codes:
SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    created_at
FROM quotations 
WHERE merchant_code IS NOT NULL 
AND status IN ('waiting_for_admin', 'approved', 'rejected', 'closed')
ORDER BY created_at DESC;

-- ========================================
-- 6. CHECK PENDING QUOTATIONS
-- ========================================
SELECT '=== PENDING QUOTATIONS ===' as section;

SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    created_at
FROM quotations 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ========================================
-- 7. CREATE TEST QUOTATION FOR MERCHANT
-- ========================================
SELECT '=== CREATE TEST QUOTATION ===' as section;

-- Get the first merchant code
DO $$
DECLARE
    first_merchant_code TEXT;
BEGIN
    SELECT merchant_code INTO first_merchant_code 
    FROM merchants 
    WHERE merchant_code IS NOT NULL 
    LIMIT 1;
    
    IF first_merchant_code IS NOT NULL THEN
        -- Insert a test quotation for this merchant
        INSERT INTO quotations (
            id,
            quotation_code,
            user_id,
            merchant_code,
            status,
            items,
            created_at
        ) VALUES (
            gen_random_uuid(), -- Generate a UUID for the id
            'TEST-Q-' || EXTRACT(EPOCH FROM NOW())::TEXT,
            'cdabf740-3adc-44b3-8a10-d7063e849816', -- Admin user ID
            first_merchant_code,
            'waiting_for_admin',
            '[{"product_id": "test-product", "quantity": 2, "price": 500.00}]',
            NOW()
        );
        
        RAISE NOTICE 'Test quotation created for merchant: %', first_merchant_code;
    ELSE
        RAISE NOTICE 'No merchant codes found to create test quotation';
    END IF;
END $$;

-- ========================================
-- 8. FINAL VERIFICATION
-- ========================================
SELECT '=== FINAL VERIFICATION ===' as section;

-- Check all quotations again
SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    created_at
FROM quotations 
ORDER BY created_at DESC;

SELECT 'Debug completed!' as status;
