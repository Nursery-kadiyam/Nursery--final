-- FIX QUOTATIONS PRODUCT DISPLAY ISSUE
-- This fixes the problem where quotation responses show "Unknown Product" instead of actual product names and images

-- 1. Check current quotation data structure
SELECT 
    'Current Quotation Data Check' as check_type,
    COUNT(*) as total_quotations,
    COUNT(CASE WHEN merchant_code IS NOT NULL THEN 1 END) as merchant_responses,
    COUNT(CASE WHEN items IS NOT NULL AND items != '[]'::jsonb THEN 1 END) as quotations_with_items
FROM quotations;

-- 2. Check specific problematic quotation QC-2025-0027
SELECT 
    'QC-2025-0027 Data Check' as check_type,
    id,
    quotation_code,
    merchant_code,
    items,
    unit_prices,
    status,
    created_at
FROM quotations
WHERE quotation_code = 'QC-2025-0027';

-- 3. Check if quotation items have product_id references
SELECT 
    'Quotation Items Product ID Check' as check_type,
    quotation_code,
    merchant_code,
    jsonb_array_length(items) as items_count,
    jsonb_pretty(items) as items_json
FROM quotations
WHERE quotation_code = 'QC-2025-0027'
AND items IS NOT NULL;

-- 4. Check products table for available products
SELECT 
    'Available Products Check' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as products_with_names,
    COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as products_with_images
FROM products;

-- 5. Create a function to get quotation responses with product data
CREATE OR REPLACE FUNCTION get_quotation_responses_with_products(p_quotation_code TEXT)
RETURNS TABLE (
    id CHARACTER VARYING,
    quotation_code CHARACTER VARYING,
    merchant_code TEXT,
    items JSONB,
    unit_prices JSONB,
    transport_cost NUMERIC,
    custom_work_cost NUMERIC,
    estimated_delivery_days INTEGER,
    total_quote_price NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    modified_specifications JSONB,
    merchant_name TEXT,
    merchant_email TEXT,
    merchant_phone TEXT,
    items_with_products JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.quotation_code,
        q.merchant_code,
        q.items,
        q.unit_prices,
        q.transport_cost,
        q.custom_work_cost,
        q.estimated_delivery_days,
        q.total_quote_price,
        q.status,
        q.created_at,
        q.updated_at,
        q.modified_specifications,
        COALESCE(m.nursery_name, 'Unknown Merchant') as merchant_name,
        m.email as merchant_email,
        m.phone_number as merchant_phone,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', item.value->>'id',
                        'product_id', item.value->>'product_id',
                        'product_name', COALESCE(p.name, item.value->>'product_name', 'Unknown Product'),
                        'product_image', COALESCE(p.image_url, item.value->>'image_url', '/assets/placeholder.svg'),
                        'plant_type', item.value->>'plant_type',
                        'age_category', item.value->>'age_category',
                        'bag_size', item.value->>'bag_size',
                        'height', item.value->>'height',
                        'stem', item.value->>'stem',
                        'weight', item.value->>'weight',
                        'quantity', item.value->>'quantity',
                        'original_item', item.value
                    )
                )
                FROM jsonb_array_elements(q.items) AS item
                LEFT JOIN products p ON (item.value->>'product_id')::uuid = p.id
                WHERE item.value IS NOT NULL
            ),
            '[]'::jsonb
        ) as items_with_products
    FROM quotations q
    LEFT JOIN merchants m ON q.merchant_code = m.merchant_code
    WHERE q.quotation_code = p_quotation_code
    AND q.merchant_code IS NOT NULL
    ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_quotation_responses_with_products TO authenticated;

-- 7. Test the function with QC-2025-0027
SELECT 
    'Function Test - QC-2025-0027' as check_type,
    *
FROM get_quotation_responses_with_products('QC-2025-0027');

-- 8. Update quotation items to have proper product_id references if missing
-- This will try to match products by name for existing quotations
UPDATE quotations 
SET items = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', item.value->>'id',
            'product_id', COALESCE(
                item.value->>'product_id',
                (
                    SELECT id::text 
                    FROM products 
                    WHERE LOWER(name) = LOWER(item.value->>'product_name')
                    AND merchant_code = quotations.merchant_code
                    LIMIT 1
                )
            ),
            'product_name', item.value->>'product_name',
            'plant_type', item.value->>'plant_type',
            'age_category', item.value->>'age_category',
            'bag_size', item.value->>'bag_size',
            'height', item.value->>'height',
            'stem', item.value->>'stem',
            'weight', item.value->>'weight',
            'quantity', item.value->>'quantity'
        )
    )
    FROM jsonb_array_elements(quotations.items) AS item
    WHERE quotations.items IS NOT NULL
    AND quotations.quotation_code = 'QC-2025-0027'
)
WHERE quotation_code = 'QC-2025-0027'
AND items IS NOT NULL;

-- 9. Test the updated function again
SELECT 
    'Updated Function Test - QC-2025-0027' as check_type,
    *
FROM get_quotation_responses_with_products('QC-2025-0027');

-- 10. Check for any remaining issues
SELECT 
    'Final Verification' as check_type,
    quotation_code,
    merchant_code,
    jsonb_array_length(items) as items_count,
    CASE 
        WHEN items IS NULL THEN 'NO ITEMS'
        WHEN jsonb_array_length(items) = 0 THEN 'EMPTY ITEMS'
        ELSE 'HAS ITEMS'
    END as items_status
FROM quotations
WHERE quotation_code = 'QC-2025-0027'
ORDER BY created_at;