-- Fix for quotation specifications and image flickering issues
-- This script addresses user specifications being lost and image flickering

-- ========================================
-- 1. UPDATE get_quotation_responses_with_products FUNCTION
-- ========================================

-- Drop and recreate the function to properly merge user and merchant specifications
DROP FUNCTION IF EXISTS public.get_quotation_responses_with_products(TEXT);

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
        -- Enhanced items with merged specifications and stable images
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

-- ========================================
-- 2. CREATE TRIGGER TO ENSURE STABLE IMAGES
-- ========================================

-- Function to ensure order items have stable images
CREATE OR REPLACE FUNCTION ensure_order_item_image()
RETURNS trigger AS $$
BEGIN
  -- If quotation_product_image is empty, fallback to products.image_url
  IF NEW.quotation_product_image IS NULL OR NEW.quotation_product_image = '' OR NEW.quotation_product_image = '/assets/placeholder.svg' THEN
    SELECT p.image_url INTO NEW.quotation_product_image
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- If still no image, use placeholder
    IF NEW.quotation_product_image IS NULL OR NEW.quotation_product_image = '' THEN
      NEW.quotation_product_image := '/assets/placeholder.svg';
    END IF;
  END IF;
  
  -- Ensure quotation_product_name is also populated
  IF NEW.quotation_product_name IS NULL OR NEW.quotation_product_name = '' THEN
    SELECT p.name INTO NEW.quotation_product_name
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- If still no name, use fallback
    IF NEW.quotation_product_name IS NULL OR NEW.quotation_product_name = '' THEN
      NEW.quotation_product_name := 'Unknown Product';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_order_item_image_trigger ON order_items;

-- Create the trigger
CREATE TRIGGER ensure_order_item_image_trigger
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION ensure_order_item_image();

-- ========================================
-- 3. UPDATE EXISTING ORDER ITEMS WITH STABLE IMAGES
-- ========================================

-- Update existing order items to have stable images
UPDATE order_items 
SET 
    quotation_product_image = COALESCE(
        quotation_product_image,
        (SELECT p.image_url FROM products p WHERE p.id = order_items.product_id),
        '/assets/placeholder.svg'
    ),
    quotation_product_name = COALESCE(
        quotation_product_name,
        (SELECT p.name FROM products p WHERE p.id = order_items.product_id),
        'Unknown Product'
    )
WHERE quotation_product_image IS NULL 
   OR quotation_product_image = '' 
   OR quotation_product_image = '/assets/placeholder.svg';

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quotation_responses_with_products TO anon;

-- ========================================
-- 5. TEST THE FUNCTION
-- ========================================

SELECT 'Function and triggers created successfully' as status;

-- Optional: Test with a real quotation code
-- SELECT * FROM public.get_quotation_responses_with_products('QC-2025-0033') LIMIT 1;