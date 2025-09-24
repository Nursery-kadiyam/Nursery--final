-- Add duplicate prevention for orders
-- This script adds constraints to prevent duplicate orders for the same quotation

-- 1. Add a unique constraint to prevent multiple parent orders for the same quotation
-- This will prevent creating multiple parent orders for the same quotation_code + user_id
ALTER TABLE orders 
ADD CONSTRAINT unique_parent_order_per_quotation 
UNIQUE (quotation_code, user_id, parent_order_id) 
WHERE parent_order_id IS NULL;

-- 2. Add a unique constraint to prevent multiple child orders for the same quotation + merchant
-- This will prevent creating multiple child orders for the same quotation_code + user_id + merchant_code
ALTER TABLE orders 
ADD CONSTRAINT unique_child_order_per_quotation_merchant 
UNIQUE (quotation_code, user_id, merchant_code, parent_order_id) 
WHERE parent_order_id IS NOT NULL;

-- 3. Add an index to improve performance of duplicate checks
CREATE INDEX IF NOT EXISTS idx_orders_quotation_user_parent 
ON orders (quotation_code, user_id, parent_order_id);

-- 4. Test the constraints by trying to insert a duplicate (this should fail)
-- Uncomment the lines below to test:
-- INSERT INTO orders (user_id, quotation_code, parent_order_id, merchant_code, total_amount, status)
-- VALUES ('test-user-id', 'QC-2025-0023', NULL, 'parent', 100.00, 'pending');