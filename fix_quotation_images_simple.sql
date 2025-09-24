-- Simple fix for quotation images - link plant names to products table
-- This approach directly matches plant names to products and fetches images

-- Drop the existing function that's causing 400 errors
DROP FUNCTION IF EXISTS public.get_quotation_responses_with_products(TEXT);

-- Create a simpler, more reliable function
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
        -- Enhanced items with product information by matching plant names
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
                        'quantity', COALESCE(
                            (q.modified_specifications->(item_idx::text)->>'quantity')::integer,
                            (item->>'quantity')::integer,
                            1
                        ),
                        'plant_type', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'plant_type',
                            item->>'plant_type',
                            '-'
                        ),
                        'age_category', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'age_category',
                            item->>'age_category',
                            '-'
                        ),
                        'bag_size', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'bag_size',
                            item->>'bag_size',
                            '-'
                        ),
                        'height_range', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'height_range',
                            item->>'height_range',
                            '-'
                        ),
                        'stem_thickness', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'stem_thickness',
                            item->>'stem_thickness',
                            '-'
                        ),
                        'weight', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'weight',
                            item->>'weight',
                            '-'
                        ),
                        'variety', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'variety',
                            item->>'variety',
                            '-'
                        ),
                        'delivery_location', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'delivery_location',
                            item->>'delivery_location',
                            '-'
                        ),
                        'delivery_timeline', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'delivery_timeline',
                            item->>'delivery_timeline',
                            '-'
                        ),
                        'is_grafted', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'is_grafted',
                            item->>'is_grafted',
                            '-'
                        ),
                        'year', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'year',
                            item->>'year',
                            '-'
                        ),
                        'size', COALESCE(
                            q.modified_specifications->(item_idx::text)->>'size',
                            item->>'size',
                            '-'
                        ),
                        'has_modified_specs', CASE 
                            WHEN q.modified_specifications->(item_idx::text) IS NOT NULL 
                            THEN true 
                            ELSE false 
                        END
                    )
                )
                FROM jsonb_array_elements(q.items) WITH ORDINALITY AS item(item, item_idx)
                LEFT JOIN products p ON (
                    p.id = (item->>'product_id')::uuid OR 
                    LOWER(p.name) = LOWER(item->>'product_name') OR
                    LOWER(p.name) LIKE '%' || LOWER(item->>'product_name') || '%' OR
                    LOWER(item->>'product_name') LIKE '%' || LOWER(p.name) || '%'
                )
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO anon;

-- Test the function
SELECT 'Function created successfully' as status;

-- Optional: Test with a real quotation code
-- SELECT * FROM public.get_quotation_responses_with_products('QC-2025-0033') LIMIT 1;