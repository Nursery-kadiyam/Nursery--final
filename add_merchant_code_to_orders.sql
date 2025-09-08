-- Add merchant_code column to orders table if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Add merchant_code column to orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_code') THEN
        ALTER TABLE orders ADD COLUMN merchant_code TEXT;
        RAISE NOTICE 'Added merchant_code column to orders table';
    ELSE
        RAISE NOTICE 'merchant_code column already exists in orders table';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);

-- Update existing orders to have a default merchant_code if they don't have one
UPDATE orders 
SET merchant_code = 'admin' 
WHERE merchant_code IS NULL;

-- Make merchant_code NOT NULL after setting default values
ALTER TABLE orders ALTER COLUMN merchant_code SET NOT NULL;
