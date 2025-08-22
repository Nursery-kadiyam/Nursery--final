-- Fix Test Quotation Data
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT TEST QUOTATION
-- ========================================
SELECT '=== CHECKING CURRENT TEST QUOTATION ===' as section;

SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    product_cost,
    transport_cost,
    custom_work_cost,
    total_quote_price,
    estimated_delivery_days,
    items,
    created_at
FROM quotations 
WHERE quotation_code LIKE 'TEST-Q-%'
ORDER BY created_at DESC 
LIMIT 1;

-- ========================================
-- 2. UPDATE TEST QUOTATION WITH PROPER DATA
-- ========================================
SELECT '=== UPDATING TEST QUOTATION ===' as section;

-- Update the latest test quotation with proper cost data
UPDATE quotations 
SET 
    product_cost = 1000.00,
    transport_cost = 200.00,
    custom_work_cost = 150.00,
    total_quote_price = 1350.00,
    estimated_delivery_days = 7,
    unit_prices = '["500.00"]',
    updated_at = NOW()
WHERE quotation_code LIKE 'TEST-Q-%'
AND status = 'waiting_for_admin'
ORDER BY created_at DESC 
LIMIT 1;

-- ========================================
-- 3. CREATE A PROPER PRODUCT FOR TESTING
-- ========================================
SELECT '=== CREATING TEST PRODUCT ===' as section;

-- Insert a test product if it doesn't exist
INSERT INTO products (
    id,
    name,
    price,
    available_quantity,
    image_url,
    merchant_email,
    created_at
) VALUES (
    gen_random_uuid(),
    'Beautiful Rose Plant',
    500.00,
    50,
    'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400',
    'admin@example.com',
    NOW()
) ON CONFLICT DO NOTHING;

-- ========================================
-- 4. UPDATE QUOTATION ITEMS WITH PROPER PRODUCT
-- ========================================
SELECT '=== UPDATING QUOTATION ITEMS ===' as section;

-- Get the product ID we just created
DO $$
DECLARE
    product_id UUID;
    quotation_id UUID;
BEGIN
    -- Get the latest test quotation
    SELECT id INTO quotation_id 
    FROM quotations 
    WHERE quotation_code LIKE 'TEST-Q-%'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Get the product ID
    SELECT id INTO product_id 
    FROM products 
    WHERE name = 'Beautiful Rose Plant'
    LIMIT 1;
    
    IF quotation_id IS NOT NULL AND product_id IS NOT NULL THEN
        -- Update the quotation items with proper product data
        UPDATE quotations 
        SET items = jsonb_build_array(
            jsonb_build_object(
                'product_id', product_id,
                'product_name', 'Beautiful Rose Plant',
                'quantity', 2,
                'price', 500.00,
                'image_url', 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400'
            )
        )
        WHERE id = quotation_id;
        
        RAISE NOTICE 'Updated quotation % with proper product data', quotation_id;
    ELSE
        RAISE NOTICE 'Could not find quotation or product to update';
    END IF;
END $$;

-- ========================================
-- 5. VERIFY THE UPDATED QUOTATION
-- ========================================
SELECT '=== VERIFYING UPDATED QUOTATION ===' as section;

SELECT 
    id,
    quotation_code,
    user_id,
    merchant_code,
    status,
    product_cost,
    transport_cost,
    custom_work_cost,
    total_quote_price,
    estimated_delivery_days,
    items,
    created_at,
    updated_at
FROM quotations 
WHERE quotation_code LIKE 'TEST-Q-%'
ORDER BY created_at DESC 
LIMIT 1;

-- ========================================
-- 6. CHECK PRODUCTS TABLE
-- ========================================
SELECT '=== CHECKING PRODUCTS ===' as section;

SELECT 
    id,
    name,
    price,
    available_quantity,
    image_url,
    merchant_email
FROM products 
WHERE name = 'Beautiful Rose Plant'
ORDER BY created_at DESC;

SELECT 'Test quotation data fix completed!' as status;
