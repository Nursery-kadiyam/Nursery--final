# 🌱 COMPLETE FIX: Plant Names & Images in Merchant Dashboard

## 🎯 **Problem Solved**
- ❌ Merchant dashboard shows "Unknown Product" instead of plant names
- ❌ No plant images displayed in merchant orders
- ❌ User orders show correct data but merchant orders don't

## 🔧 **Root Cause**
The `order_items` table was missing crucial columns:
- `quotation_product_name` - stores plant names from quotations
- `quotation_product_image` - stores plant images from quotations
- `subtotal` - calculated order item totals
- `merchant_code` - links items to merchants

## ✅ **Complete Solution**

### **Step 1: Run Database Fix**

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- COMPLETE FIX FOR MERCHANT PRODUCT DISPLAY
-- This fixes the "Unknown Product" issue in merchant dashboard

-- ========================================
-- 1. ADD MISSING COLUMNS TO ORDER_ITEMS
-- ========================================

-- Add quotation_product_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='quotation_product_name') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='quotation_product_image') THEN
        ALTER TABLE order_items ADD COLUMN quotation_product_image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='subtotal') THEN
        ALTER TABLE order_items ADD COLUMN subtotal NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='order_items' AND column_name='merchant_code') THEN
        ALTER TABLE order_items ADD COLUMN merchant_code TEXT;
    END IF;
END $$;

-- ========================================
-- 2. BACKFILL EXISTING ORDER_ITEMS
-- ========================================

-- Update existing order_items with product data
UPDATE order_items oi
SET quotation_product_name = p.name,
    quotation_product_image = p.image_url,
    subtotal = oi.price * oi.quantity,
    merchant_code = o.merchant_code
FROM products p
JOIN orders o ON o.id = oi.order_id
WHERE oi.product_id = p.id
  AND (oi.quotation_product_name IS NULL OR oi.quotation_product_image IS NULL);

-- ========================================
-- 3. CREATE TRIGGER TO AUTO-POPULATE DATA
-- ========================================

-- Replace trigger function to always populate quotation data
CREATE OR REPLACE FUNCTION update_order_item_with_quotation_data()
RETURNS trigger AS $$
BEGIN
    -- Populate product name and image from products table
    IF NEW.product_id IS NOT NULL THEN
        SELECT p.name, p.image_url
        INTO NEW.quotation_product_name, NEW.quotation_product_image
        FROM products p WHERE p.id = NEW.product_id;
    END IF;

    -- Get merchant_code from the order
    IF NEW.order_id IS NOT NULL THEN
        SELECT o.merchant_code
        INTO NEW.merchant_code
        FROM orders o WHERE o.id = NEW.order_id;
    END IF;

    -- Calculate subtotal
    NEW.subtotal := COALESCE(NEW.price,0) * COALESCE(NEW.quantity,1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_order_item_with_quotation_data ON order_items;
CREATE TRIGGER trigger_update_order_item_with_quotation_data
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_item_with_quotation_data();

-- ========================================
-- 4. FIX MERCHANT FUNCTIONS
-- ========================================

-- Drop and recreate the merchant orders function
DROP FUNCTION IF EXISTS get_merchant_orders_with_products(text);

CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    buyer_reference TEXT,
    order_items JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        o.order_code, 
        o.status, 
        o.created_at, 
        o.total_amount,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(oi.quotation_product_name, p.name, 'Unknown Product'),
                    'product_image', COALESCE(oi.quotation_product_image, p.image_url, '/assets/placeholder.svg'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', COALESCE(oi.subtotal, oi.price * oi.quantity)
                )
            )
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        ), '[]'::jsonb) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Create order details function
DROP FUNCTION IF EXISTS get_merchant_order_details(uuid, text);

CREATE OR REPLACE FUNCTION get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    buyer_reference TEXT,
    order_items JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        o.order_code, 
        o.status, 
        o.created_at, 
        o.total_amount,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(oi.quotation_product_name, p.name, 'Unknown Product'),
                    'product_image', COALESCE(oi.quotation_product_image, p.image_url, '/assets/placeholder.svg'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', COALESCE(oi.subtotal, oi.price * oi.quantity)
                )
            )
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        ), '[]'::jsonb) as order_items
    FROM orders o
    WHERE o.id = p_order_id 
    AND o.merchant_code = p_merchant_code;
END;
$$;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_order_details TO authenticated;

-- ========================================
-- 6. TEST THE FIX
-- ========================================

-- Test the function
SELECT 
    'TESTING FIXED FUNCTION' as info,
    order_code,
    total_amount,
    status,
    jsonb_array_length(order_items) as item_count
FROM get_merchant_orders_with_products('MC-2025-TXYR')
LIMIT 3;

-- Check if order_items now have product data
SELECT 
    'CHECKING ORDER_ITEMS DATA' as info,
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.subtotal
FROM order_items oi
WHERE oi.quotation_product_name IS NOT NULL
LIMIT 5;
```

### **Step 2: Frontend Updates (Already Applied)**

The following files have been updated:

1. **`src/pages/MerchantDashboard.tsx`**:
   - Updated `RecentOrders` component to use `get_merchant_orders_with_products`
   - Updated `OrderManagement` component to use the enhanced function
   - Added safe data processing for product names and images

2. **`src/pages/Orders.tsx`**:
   - Already has proper fallback handling for product names and images

### **Step 3: Test the Fix**

1. **Run the SQL script** in your Supabase SQL Editor
2. **Refresh your merchant dashboard** - you should now see actual plant names and images
3. **Check the browser console** for any errors
4. **Verify that both merchant and user views** show correct product information

## 🎯 **Expected Results**

After applying this fix:

### **Merchant Dashboard:**
- ✅ Shows actual plant names (e.g., "Croton Plant", "Rela", "Cassia Tree")
- ✅ Displays plant images from the products table
- ✅ Shows correct quantities and prices
- ✅ No more "Unknown Product" displays

### **User Orders Page:**
- ✅ Continues to show correct product information
- ✅ Maintains existing functionality
- ✅ Shows plant names and images correctly

### **Database:**
- ✅ `order_items` table now has all required columns
- ✅ Existing data is backfilled with product information
- ✅ New orders automatically get product data populated
- ✅ Triggers ensure data consistency

## 🔍 **How It Works**

1. **Database Schema**: Added missing columns to store product names and images
2. **Data Population**: Backfilled existing order_items with product data
3. **Triggers**: Automatically populate product data for new orders
4. **Functions**: Enhanced to prioritize quotation data with fallbacks
5. **Frontend**: Safely handles data with proper fallbacks

## 🚨 **Important Notes**

- **No data loss**: Existing orders are preserved and enhanced
- **Backward compatible**: Works with both old and new order formats
- **Privacy protected**: Merchant data remains anonymized
- **Performance optimized**: Uses efficient database functions

## 🧪 **Testing**

Use the provided `test_merchant_dashboard_fix.html` file to test the database functions:

1. Open the HTML file in your browser
2. Update the Supabase credentials
3. Click "Test Merchant Orders Function"
4. Verify that plant names and images are displayed correctly

## 📊 **Verification Queries**

Run these queries in Supabase SQL Editor to verify the fix:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('quotation_product_name', 'quotation_product_image', 'subtotal', 'merchant_code');

-- Check if data is populated
SELECT 
    oi.id,
    oi.quotation_product_name,
    oi.quotation_product_image,
    oi.subtotal
FROM order_items oi
WHERE oi.quotation_product_name IS NOT NULL
LIMIT 5;

-- Test the merchant function
SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR') LIMIT 3;
```

## ✅ **Success Indicators**

- Merchant dashboard shows actual plant names instead of "Unknown Product"
- Plant images are displayed correctly
- Order details show proper product information
- No console errors in browser
- Database functions return expected data structure

This comprehensive fix addresses both the database schema issues and ensures the data flow works correctly for both merchants and users.