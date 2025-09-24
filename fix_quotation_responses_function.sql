-- Fix for get_quotation_responses_with_products function
-- This script handles the "cannot change return type" error safely

-- Step 1: Check if the function exists and what its current signature is
SELECT 
    n.nspname AS schema, 
    p.proname AS name, 
    pg_get_function_identity_arguments(p.oid) AS args,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname = 'get_quotation_responses_with_products';

-- Step 2: Drop the existing function if it exists (safe approach)
DROP FUNCTION IF EXISTS public.get_quotation_responses_with_products(TEXT);

-- Step 3: Create the new function with the correct signature
CREATE OR REPLACE FUNCTION public.get_quotation_responses_with_products(p_quotation_code TEXT)
RETURNS TABLE (
    id TEXT,
    quotation_code TEXT,
    merchant_code TEXT,
    unit_prices JSONB,
    transport_cost NUMERIC,
    custom_work_cost NUMERIC,
    estimated_delivery_days INTEGER,
    total_quote_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    items JSONB,
    items_with_products JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.quotation_code,
        q.merchant_code,
        q.unit_prices,
        q.transport_cost,
        q.custom_work_cost,
        q.estimated_delivery_days,
        q.total_quote_price,
        q.created_at,
        q.status,
        q.items,
        -- Enhanced items with product information
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'product_id', item->>'product_id',
                        'product_name', COALESCE(
                            item->>'product_name',
                            p.name,
                            'Unknown Product'
                        ),
                        'product_image', COALESCE(
                            item->>'product_image',
                            p.image_url,
                            '/assets/placeholder.svg'
                        ),
                        'quantity', item->>'quantity',
                        'plant_type', item->>'plant_type',
                        'age_category', item->>'age_category',
                        'bag_size', item->>'bag_size',
                        'height_range', item->>'height_range',
                        'stem_thickness', item->>'stem_thickness',
                        'weight', item->>'weight',
                        'variety', item->>'variety',
                        'delivery_location', item->>'delivery_location',
                        'delivery_timeline', item->>'delivery_timeline',
                        'is_grafted', item->>'is_grafted',
                        'year', item->>'year',
                        'size', item->>'size'
                    )
                )
                FROM jsonb_array_elements(q.items) AS item
                LEFT JOIN products p ON p.id = (item->>'product_id')::uuid
            ),
            '[]'::jsonb
        ) as items_with_products
    FROM quotations q
    WHERE q.quotation_code = p_quotation_code
    AND q.merchant_code IS NOT NULL
    AND q.is_user_request = FALSE
    ORDER BY q.created_at DESC;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO anon;

-- Step 5: Test the function
SELECT 'Function created successfully' as status;

-- Step 6: Verify the function works (optional test)
-- Uncomment the line below to test with a real quotation code
-- SELECT * FROM public.get_quotation_responses_with_products('QC-2025-0033') LIMIT 1;