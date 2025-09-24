-- Update existing orders from 'pending' to 'confirmed' status
-- This ensures all existing orders are automatically confirmed

-- Update parent orders
UPDATE orders 
SET status = 'confirmed' 
WHERE status = 'pending' 
AND parent_order_id IS NULL;

-- Update child orders
UPDATE orders 
SET status = 'confirmed' 
WHERE status = 'pending' 
AND parent_order_id IS NOT NULL;

-- Verify the updates
SELECT 
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY status;