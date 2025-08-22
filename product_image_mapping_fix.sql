-- Product Image Mapping Fix
-- This script adds product-specific images and creates a proper image mapping system
-- Run this in your Supabase SQL Editor

-- Step 1: Add image_gallery column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_gallery JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add additional_image_urls column for multiple images
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS additional_image_urls TEXT[] DEFAULT '{}';

-- Step 3: Update existing products with proper image mappings
UPDATE products 
SET image_gallery = CASE 
    -- Ganuga Tree
    WHEN LOWER(name) LIKE '%ganuga%' OR LOWER(name) LIKE '%pongamia%' THEN 
        '[
            {"id": 1, "src": "/assets/ganuga.jpeg", "alt": "Ganuga Tree - Main View", "thumbnail": "/assets/ganuga.jpeg"},
            {"id": 2, "src": "/assets/ganuga1.jpeg", "alt": "Ganuga Tree - Close Up", "thumbnail": "/assets/ganuga1.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.14 PM.jpeg", "alt": "Ganuga Tree - Growth Stage", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.14 PM.jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.15 PM.jpeg", "alt": "Ganuga Tree - Mature Plant", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.15 PM.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/ganuga.jpeg',
            '/assets/ganuga1.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.14 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.15 PM.jpeg'
        ]
    
    -- Ashoka Tree
    WHEN LOWER(name) LIKE '%ashoka%' OR LOWER(name) LIKE '%saraca%' THEN 
        '[
            {"id": 1, "src": "/assets/Ashoka.jpeg", "alt": "Ashoka Tree - Main View", "thumbnail": "/assets/Ashoka.jpeg"},
            {"id": 2, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM.jpeg", "alt": "Ashoka Tree - Flowering", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM (1).jpeg", "alt": "Ashoka Tree - Close Up", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM (1).jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.18 PM.jpeg", "alt": "Ashoka Tree - Garden View", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.18 PM.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Ashoka.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.16 PM (1).jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.18 PM.jpeg'
        ]
    
    -- Bamboo Plants
    WHEN LOWER(name) LIKE '%bamboo%' OR LOWER(name) LIKE '%bambusa%' THEN 
        '[
            {"id": 1, "src": "/assets/Bamboo plants.jpeg", "alt": "Bamboo Plants - Main View", "thumbnail": "/assets/Bamboo plants.jpeg"},
            {"id": 2, "src": "/assets/golden bamboo.jpeg", "alt": "Golden Bamboo - Variety", "thumbnail": "/assets/golden bamboo.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.22 PM.jpeg", "alt": "Bamboo Grove", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.22 PM.jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.23 PM.jpeg", "alt": "Bamboo Plantation", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.23 PM.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Bamboo plants.jpeg',
            '/assets/golden bamboo.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.22 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.23 PM.jpeg'
        ]
    
    -- Cassia Tree
    WHEN LOWER(name) LIKE '%cassia%' OR LOWER(name) LIKE '%senna%' THEN 
        '[
            {"id": 1, "src": "/assets/Cassia Tree.jpeg", "alt": "Cassia Tree - Main View", "thumbnail": "/assets/Cassia Tree.jpeg"},
            {"id": 2, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.24 PM.jpeg", "alt": "Cassia Tree - Flowering", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.24 PM.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.25 PM.jpeg", "alt": "Cassia Tree - Yellow Blooms", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.25 PM.jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM.jpeg", "alt": "Cassia Tree - Avenue Planting", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Cassia Tree.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.24 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.25 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM.jpeg'
        ]
    
    -- Croton Plant
    WHEN LOWER(name) LIKE '%croton%' OR LOWER(name) LIKE '%codiaeum%' THEN 
        '[
            {"id": 1, "src": "/assets/Croton plant.jpeg", "alt": "Croton Plant - Main View", "thumbnail": "/assets/Croton plant.jpeg"},
            {"id": 2, "src": "/assets/croton plant .jpeg", "alt": "Croton Plant - Colorful Leaves", "thumbnail": "/assets/croton plant .jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM (1).jpeg", "alt": "Croton Plant - Indoor Display", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM (1).jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.29 PM.jpeg", "alt": "Croton Plant - Garden View", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.29 PM.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Croton plant.jpeg',
            '/assets/croton plant .jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.26 PM (1).jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.29 PM.jpeg'
        ]
    
    -- Balaji Nimma
    WHEN LOWER(name) LIKE '%balaji%' OR LOWER(name) LIKE '%nimma%' THEN 
        '[
            {"id": 1, "src": "/assets/Balaji nimma.jpeg", "alt": "Balaji Nimma Plant - Main View", "thumbnail": "/assets/Balaji nimma.jpeg"},
            {"id": 2, "src": "/assets/Balaji nimma1.jpeg", "alt": "Balaji Nimma Plant - Close Up", "thumbnail": "/assets/Balaji nimma1.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.38 PM (1).jpeg", "alt": "Balaji Nimma Plant - Growth Stage", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.38 PM (1).jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.40 PM (1).jpeg", "alt": "Balaji Nimma Plant - Mature Plant", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.40 PM (1).jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Balaji nimma.jpeg',
            '/assets/Balaji nimma1.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.38 PM (1).jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.40 PM (1).jpeg'
        ]
    
    -- Boston Fern
    WHEN LOWER(name) LIKE '%boston%' OR LOWER(name) LIKE '%fern%' THEN 
        '[
            {"id": 1, "src": "/assets/Boston Fern.jpeg", "alt": "Boston Fern - Main View", "thumbnail": "/assets/Boston Fern.jpeg"},
            {"id": 2, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.41 PM.jpeg", "alt": "Boston Fern - Indoor Display", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.41 PM.jpeg"},
            {"id": 3, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM.jpeg", "alt": "Boston Fern - Hanging Basket", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM.jpeg"},
            {"id": 4, "src": "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM (1).jpeg", "alt": "Boston Fern - Close Up", "thumbnail": "/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM (1).jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Boston Fern.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.41 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM.jpeg',
            '/assets/WhatsApp Image 2025-06-22 at 1.43.42 PM (1).jpeg'
        ]
    
    -- Default for other products
    ELSE 
        '[
            {"id": 1, "src": "/assets/Ashoka.jpeg", "alt": "Plant - Main View", "thumbnail": "/assets/Ashoka.jpeg"},
            {"id": 2, "src": "/assets/Balaji nimma.jpeg", "alt": "Plant - Growth Stage", "thumbnail": "/assets/Balaji nimma.jpeg"},
            {"id": 3, "src": "/assets/Bamboo plants.jpeg", "alt": "Plant - Garden View", "thumbnail": "/assets/Bamboo plants.jpeg"},
            {"id": 4, "src": "/assets/Boston Fern.jpeg", "alt": "Plant - Close Up", "thumbnail": "/assets/Boston Fern.jpeg"}
        ]'::jsonb,
        additional_image_urls = ARRAY[
            '/assets/Ashoka.jpeg',
            '/assets/Balaji nimma.jpeg',
            '/assets/Bamboo plants.jpeg',
            '/assets/Boston Fern.jpeg'
        ]
END
WHERE image_gallery IS NULL OR image_gallery = '[]'::jsonb;

-- Step 4: Create a product_images table for better organization (optional)
CREATE TABLE IF NOT EXISTS product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(display_order);
CREATE INDEX IF NOT EXISTS idx_products_image_gallery ON products USING GIN(image_gallery);

-- Step 6: Insert sample product images for existing products
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
SELECT 
    p.id,
    p.image_url,
    p.name || ' - Main View',
    true,
    1
FROM products p
WHERE p.image_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 7: Verify the updates
SELECT 
    'Product image mapping completed successfully!' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN image_gallery != '[]'::jsonb THEN 1 END) as products_with_gallery,
    COUNT(CASE WHEN additional_image_urls != '{}' THEN 1 END) as products_with_additional_images
FROM products;

-- Step 8: Show sample results
SELECT 
    name,
    image_url,
    jsonb_array_length(image_gallery) as gallery_count,
    array_length(additional_image_urls, 1) as additional_images_count
FROM products 
WHERE image_gallery != '[]'::jsonb 
LIMIT 5;
