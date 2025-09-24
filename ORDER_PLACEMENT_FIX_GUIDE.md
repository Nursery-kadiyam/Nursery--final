# 🔧 Order Placement Fix Guide

## 🚨 **Problem Identified**

The order placement is failing with the error:
```
Order placement failed: Failed to create orders: new row for relation "orders" violates check constraint "orders_status_check"
```

## 🔍 **Root Causes**

1. **Constraint Issue**: The `orders_status_check` constraint only allows specific status values, but the constraint definition is incomplete
2. **Missing Columns**: The order placement function tries to insert into columns that don't exist in the `order_items` table
3. **Schema Mismatch**: The function expects columns like `merchant_code`, `subtotal`, and `quotation_id` in `order_items` table

## ✅ **Solution Steps**

### **Step 1: Fix the Orders Status Constraint**

Run the SQL script `fix_order_placement_complete.sql` in your Supabase SQL Editor:

```sql
-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add a comprehensive constraint that includes all valid statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_payment'));
```

### **Step 2: Add Missing Columns to Order Items Table**

```sql
-- Add missing columns to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS merchant_code TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quotation_id TEXT;
```

### **Step 3: Add Missing Columns to Orders Table**

```sql
-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quotation_code TEXT;
```

### **Step 4: Update the Order Placement Function**

Run the SQL script `fix_order_placement_function.sql` to create a corrected function that works with the current schema.

## 🧪 **Testing the Fix**

1. **Open the test file**: `test_order_placement_fix.html` in your browser
2. **Update Supabase credentials**: Replace the placeholder URLs and keys with your actual Supabase credentials
3. **Run the tests**:
   - Test database connection
   - Check table structures
   - Verify constraints
   - Test order placement function

## 📋 **Files Created**

1. **`fix_order_placement_complete.sql`** - Complete database schema fix
2. **`fix_order_placement_function.sql`** - Corrected order placement function
3. **`test_order_placement_fix.html`** - Test interface to verify the fix

## 🔄 **Expected Results After Fix**

- ✅ Orders can be placed with status 'confirmed'
- ✅ Order items are created successfully
- ✅ No constraint violations occur
- ✅ Order placement function returns success

## 🚀 **Quick Fix Commands**

If you want to apply the fix quickly, run these commands in your Supabase SQL Editor:

```sql
-- Quick fix for constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_payment'));

-- Quick fix for missing columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS merchant_code TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quotation_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quotation_code TEXT;
```

## ⚠️ **Important Notes**

1. **Backup your data** before running these fixes
2. **Test in a development environment** first
3. **Update your Supabase credentials** in the test file
4. **Monitor the application** after applying the fix

## 🎯 **Next Steps**

After applying the fix:
1. Test order placement in your application
2. Verify that orders appear in the merchant dashboard
3. Check that order status updates work correctly
4. Monitor for any other related issues

The order placement should now work correctly without constraint violations!