-- Insert Sample Products for Nursery Shop
-- Run this in your Supabase SQL Editor

-- Clear existing products (optional - remove if you want to keep existing data)
-- DELETE FROM products;

-- Insert sample products with proper data
INSERT INTO products (name, price, available_quantity, image_url, description, categories, rating, reviews, original_price, bestseller) VALUES
-- Ornamental Plants
('Ashoka Tree', 1200.00, 50, '/assets/Ashoka.jpeg', 'Sacred tree with beautiful flowers, perfect for gardens and temples. Known for its religious significance and ornamental value.', 'ornamental-plants', 4.5, 12, 1500.00, true),
('Bamboo Plant', 800.00, 75, '/assets/Bamboo plants.jpeg', 'Fast-growing bamboo for privacy screens and landscaping. Perfect for creating natural barriers.', 'ornamental-plants', 4.2, 8, 1000.00, false),
('Boston Fern', 450.00, 100, '/assets/Boston Fern.jpeg', 'Air-purifying fern perfect for indoor spaces. Helps improve air quality and adds greenery to your home.', 'residential-indoor', 4.3, 15, 550.00, true),
('Cassia Tree', 1800.00, 30, '/assets/Cassia Tree.jpeg', 'Beautiful flowering tree with yellow blooms. Perfect for avenue planting and large gardens.', 'landscaping-roads', 4.6, 10, 2200.00, false),

-- Flowering Plants
('Hibiscus Plant', 350.00, 120, '/assets/Hibiscus.jpeg', 'Vibrant flowering plant with large colorful blooms. Perfect for gardens and balconies.', 'flowering', 4.4, 20, 400.00, true),
('Rose Plant', 280.00, 150, '/assets/Rose.jpeg', 'Classic rose plant with fragrant flowers. Available in various colors and perfect for gifting.', 'flowering', 4.7, 25, 350.00, true),
('Jasmine Plant', 320.00, 80, '/assets/Jasmine.jpeg', 'Fragrant jasmine plant with white flowers. Perfect for creating a relaxing atmosphere.', 'flowering', 4.5, 18, 380.00, false),
('Marigold Plant', 180.00, 200, '/assets/Marigold.jpeg', 'Bright orange and yellow flowers. Easy to grow and perfect for beginners.', 'flowering', 4.1, 30, 220.00, false),

-- Fruit Plants
('Mango Tree', 2500.00, 25, '/assets/Mango.jpeg', 'Delicious mango tree that produces sweet fruits. Perfect for home gardens.', 'fruit', 4.8, 15, 3000.00, true),
('Guava Plant', 1200.00, 40, '/assets/Guava.jpeg', 'Healthy guava plant with nutritious fruits. Easy to maintain and harvest.', 'fruit', 4.3, 12, 1400.00, false),
('Lemon Tree', 1800.00, 35, '/assets/Lemon.jpeg', 'Citrus lemon tree perfect for fresh lemon supply. Great for cooking and health benefits.', 'fruit', 4.6, 20, 2200.00, true),
('Pomegranate Plant', 1600.00, 30, '/assets/Pomegranate.jpeg', 'Beautiful pomegranate plant with red fruits. Both ornamental and productive.', 'fruit', 4.4, 14, 1900.00, false),

-- Commercial Plants
('Neem Tree', 3000.00, 20, '/assets/Neem.jpeg', 'Medicinal neem tree with multiple health benefits. Perfect for commercial plantations.', 'commercial', 4.7, 8, 3500.00, true),
('Royal Palm', 4500.00, 15, '/assets/Royal Palm.jpeg', 'Majestic palm tree perfect for commercial landscaping and avenue planting.', 'landscaping-roads', 4.5, 6, 5000.00, false),
('Banyan Tree', 8000.00, 10, '/assets/Banyan.jpeg', 'Large banyan tree perfect for parks and large commercial spaces.', 'landscaping-roads', 4.8, 5, 9000.00, false),

-- Indoor Plants
('Money Plant', 250.00, 200, '/assets/Money Plant.jpeg', 'Popular indoor plant for good luck and air purification. Perfect for homes and offices.', 'residential-indoor', 4.2, 35, 300.00, true),
('Snake Plant', 400.00, 150, '/assets/Snake Plant.jpeg', 'Low-maintenance indoor plant that purifies air. Perfect for busy people.', 'residential-indoor', 4.4, 28, 450.00, false),
('Peace Lily', 350.00, 120, '/assets/Peace Lily.jpeg', 'Beautiful flowering indoor plant that helps purify indoor air.', 'residential-indoor', 4.3, 22, 400.00, false),

-- Outdoor Residential
('Gulmohar Tree', 2800.00, 25, '/assets/Gulmohar.jpeg', 'Stunning orange-red flowering tree for avenue planting and large gardens.', 'residential-outdoor', 4.6, 12, 3200.00, true),
('Croton Plant', 600.00, 80, '/assets/Croton.jpeg', 'Colorful foliage plant for tropical gardens. Adds vibrant colors to your landscape.', 'residential-outdoor', 4.1, 18, 700.00, false),
('Bougainvillea', 450.00, 100, '/assets/Bougainvillea.jpeg', 'Beautiful climbing plant with colorful bracts. Perfect for walls and fences.', 'residential-outdoor', 4.3, 25, 500.00, false),

-- Industrial Plants
('Eucalyptus Tree', 3500.00, 30, '/assets/Eucalyptus.jpeg', 'Fast-growing tree perfect for industrial plantations and timber production.', 'industrial', 4.4, 8, 4000.00, false),
('Teak Tree', 6000.00, 20, '/assets/Teak.jpeg', 'Premium timber tree with high commercial value. Perfect for long-term investment.', 'industrial', 4.7, 6, 7000.00, true),

-- Beautification Plants
('Coleus Plant', 200.00, 150, '/assets/Coleus.jpeg', 'Colorful foliage plant perfect for beautification projects and garden borders.', 'beautification', 4.2, 20, 250.00, false),
('Ixora Plant', 350.00, 120, '/assets/Ixora.jpeg', 'Beautiful flowering shrub perfect for beautification and landscaping projects.', 'beautification', 4.3, 16, 400.00, false),
('Bougainvillea Dwarf', 300.00, 100, '/assets/Bougainvillea Dwarf.jpeg', 'Compact bougainvillea perfect for small gardens and beautification projects.', 'beautification', 4.1, 14, 350.00, false),

-- Schools & Hospitals
('Aloe Vera Plant', 180.00, 200, '/assets/Aloe Vera.jpeg', 'Medicinal plant perfect for schools and hospitals. Easy to maintain and has healing properties.', 'landscaping-schools', 4.5, 30, 220.00, true),
('Tulsi Plant', 120.00, 250, '/assets/Tulsi.jpeg', 'Sacred basil plant with medicinal properties. Perfect for educational institutions.', 'landscaping-schools', 4.4, 40, 150.00, true),
('Spider Plant', 280.00, 150, '/assets/Spider Plant.jpeg', 'Air-purifying plant perfect for hospitals and schools. Removes harmful toxins.', 'landscaping-schools', 4.2, 25, 320.00, false),

-- Apartments
('Dracaena Plant', 400.00, 120, '/assets/Dracaena.jpeg', 'Tall indoor plant perfect for apartment lobbies and common areas.', 'landscaping-apartments', 4.3, 18, 450.00, false),
('Ficus Plant', 600.00, 80, '/assets/Ficus.jpeg', 'Large indoor tree perfect for apartment complexes and office spaces.', 'landscaping-apartments', 4.4, 12, 700.00, false),
('Areca Palm', 800.00, 60, '/assets/Areca Palm.jpeg', 'Elegant palm perfect for apartment gardens and indoor spaces.', 'landscaping-apartments', 4.5, 15, 900.00, true);

-- Verify the insertion
SELECT 
    'Sample products inserted successfully!' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN bestseller = true THEN 1 END) as bestsellers
FROM products;

