-- Ensure we have some test products in the database
-- This script will create a few sample products if they don't exist

-- First, let's check if we have any products
SELECT COUNT(*) as product_count FROM products;

-- If no products exist, create some sample products
-- Note: This assumes you have at least one merchant in the system
-- You may need to adjust the merchant_code to match an existing merchant

INSERT INTO products (name, description, categories, available_quantity, image_url, specifications, care_instructions, about, merchant_code)
SELECT 
    'Bamboo Plant',
    'Beautiful bamboo plant perfect for indoor decoration',
    'Indoor Plants',
    100,
    '/assets/Bamboo plants.jpeg',
    'Height: 2-3 ft, Age: 6-12 months',
    'Water regularly, keep in indirect sunlight',
    'A versatile plant that brings good luck and prosperity',
    m.merchant_code
FROM merchants m 
WHERE m.status = 'approved' 
LIMIT 1
ON CONFLICT (name, merchant_code) DO NOTHING;

INSERT INTO products (name, description, categories, available_quantity, image_url, specifications, care_instructions, about, merchant_code)
SELECT 
    'Rose Bush',
    'Colorful rose bush for garden decoration',
    'Outdoor Plants',
    50,
    '/assets/Rose Bush.jpeg',
    'Height: 1-2 ft, Age: 3-6 months',
    'Full sunlight, water daily',
    'Beautiful flowering plant perfect for gardens',
    m.merchant_code
FROM merchants m 
WHERE m.status = 'approved' 
LIMIT 1
ON CONFLICT (name, merchant_code) DO NOTHING;

INSERT INTO products (name, description, categories, available_quantity, image_url, specifications, care_instructions, about, merchant_code)
SELECT 
    'Ficus Plant',
    'Large indoor ficus plant',
    'Indoor Plants',
    75,
    '/assets/Ficus lyrata.jpeg',
    'Height: 3-4 ft, Age: 1-2 years',
    'Bright indirect light, water weekly',
    'A statement plant that purifies the air',
    m.merchant_code
FROM merchants m 
WHERE m.status = 'approved' 
LIMIT 1
ON CONFLICT (name, merchant_code) DO NOTHING;

-- Check the final count
SELECT COUNT(*) as final_product_count FROM products;
SELECT name, merchant_code FROM products ORDER BY created_at DESC LIMIT 5;