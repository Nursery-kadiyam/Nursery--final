-- Fix Infinite Loading by Adding Sample Data
-- Run this in Supabase SQL Editor

-- 1. Add sample merchants
INSERT INTO merchants (id, full_name, nursery_name, email, phone_number, address, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'John Doe', 'Green Garden Nursery', 'john@example.com', '9876543210', '123 Garden Street, City', 'approved', NOW(), NOW()),
    (gen_random_uuid(), 'Jane Smith', 'Flower Paradise', 'jane@example.com', '9876543211', '456 Flower Avenue, Town', 'pending', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Add sample orders
INSERT INTO orders (id, user_id, delivery_address, shipping_address, total_amount, cart_items, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), (SELECT id FROM auth.users LIMIT 1), 
     '{"name": "Test User", "phone": "1234567890", "addressLine1": "Test Address", "city": "Test City"}', 
     'Test Shipping Address', 1500.00, 
     '[{"name": "Rose Plant", "quantity": 2, "price": 750}]', 
     'pending', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM auth.users LIMIT 1), 
     '{"name": "Test User 2", "phone": "1234567891", "addressLine1": "Test Address 2", "city": "Test City 2"}', 
     'Test Shipping Address 2', 2000.00, 
     '[{"name": "Bamboo Plant", "quantity": 1, "price": 2000}]', 
     'delivered', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Add sample quotations
INSERT INTO quotations (id, user_id, user_email, quotation_code, items, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), (SELECT id FROM auth.users LIMIT 1), 'test@example.com', 'QT001', 
     '[{"product_id": "1", "product_name": "Rose Plant", "quantity": 5}]', 
     'pending', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM auth.users LIMIT 1), 'test@example.com', 'QT002', 
     '[{"product_id": "2", "product_name": "Bamboo Plant", "quantity": 3}]', 
     'waiting_for_admin', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4. Add sample products
INSERT INTO products (id, name, description, price, category, image_url, stock_quantity, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Rose Plant', 'Beautiful red rose plant', 750.00, 'Flowering Plants', '/assets/rose.jpg', 50, NOW(), NOW()),
    (gen_random_uuid(), 'Bamboo Plant', 'Lucky bamboo plant', 2000.00, 'Indoor Plants', '/assets/bamboo.jpg', 25, NOW(), NOW()),
    (gen_random_uuid(), 'Money Plant', 'Money plant for good luck', 500.00, 'Indoor Plants', '/assets/money-plant.jpg', 100, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 5. Verify the data
SELECT '=== SAMPLE DATA ADDED ===' as status;

SELECT 'Merchants:' as table_name, COUNT(*) as count FROM merchants
UNION ALL
SELECT 'Orders:', COUNT(*) FROM orders
UNION ALL
SELECT 'Quotations:', COUNT(*) FROM quotations
UNION ALL
SELECT 'Products:', COUNT(*) FROM products;

-- 6. Check admin dashboard data
SELECT '=== ADMIN DASHBOARD DATA ===' as status;
SELECT 
    'Total Revenue: ₹' || COALESCE(SUM(total_amount), 0) as revenue,
    'Total Orders: ' || COUNT(*) as orders,
    'Pending Orders: ' || COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
FROM orders;

