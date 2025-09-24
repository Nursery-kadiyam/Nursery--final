# 🔧 Duplicate Order Constraint Fix Guide

## 🚨 **New Problem Identified**

After fixing the status constraint, a new error appeared:
```
Order placement failed: Failed to create orders: duplicate key value violates unique constraint "unique_parent_order_per_quotation"
```

## 🔍 **Root Cause**

The database has a unique constraint `unique_parent_order_per_quotation` that prevents creating multiple orders for the same quotation and user. This constraint was designed to prevent duplicate orders, but it's too restrictive and prevents legitimate order updates.

## ✅ **Solution**

### **Quick Fix (Recommended)**

Run this SQL script in your Supabase SQL Editor:

```sql
-- Remove the problematic unique constraints
DROP INDEX IF EXISTS unique_parent_order_per_quotation;
DROP INDEX IF EXISTS unique_child_order_per_quotation_merchant;

-- Drop any constraints with the same name
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_parent_order_per_quotation;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_child_order_per_quotation_merchant;

-- Clean up existing duplicate orders
WITH duplicate_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY quotation_code, user_id 
            ORDER BY created_at DESC
        ) as rn
    FROM orders 
    WHERE quotation_code IS NOT NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);
```

### **Complete Fix (Advanced)**

If you want a more sophisticated solution that allows order updates instead of preventing them, use the `fix_duplicate_order_constraint.sql` script which:

1. Removes the problematic constraints
2. Cleans up duplicate orders
3. Creates a better unique constraint that allows updates
4. Updates the order placement function to handle existing orders

## 📋 **Files Created**

1. **`quick_fix_duplicate_constraint.sql`** - Simple fix that just removes the constraints
2. **`fix_duplicate_order_constraint.sql`** - Complete fix with improved order handling
3. **Updated `test_order_placement_fix.html`** - Test interface with duplicate constraint checking

## 🧪 **Testing the Fix**

1. **Open the test file**: `test_order_placement_fix.html` in your browser
2. **Update Supabase credentials**: Replace the placeholder URLs and keys
3. **Run the tests**:
   - Test database connection
   - Check duplicate constraints
   - Test order placement function

## 🔄 **Expected Results After Fix**

- ✅ Orders can be placed without duplicate key violations
- ✅ Existing duplicate orders are cleaned up
- ✅ Order placement function works correctly
- ✅ No more "unique_parent_order_per_quotation" errors

## ⚠️ **Important Notes**

1. **Backup your data** before running these fixes
2. **The quick fix is recommended** for immediate resolution
3. **Test in development** before applying to production
4. **Monitor order creation** after applying the fix

## 🚀 **Quick Commands**

If you want to apply the fix immediately, run these commands in your Supabase SQL Editor:

```sql
-- Quick fix for duplicate constraint
DROP INDEX IF EXISTS unique_parent_order_per_quotation;
DROP INDEX IF EXISTS unique_child_order_per_quotation_merchant;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_parent_order_per_quotation;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_child_order_per_quotation_merchant;
```

## 🎯 **Next Steps**

After applying the fix:
1. Test order placement in your application
2. Verify that orders are created successfully
3. Check that no duplicate constraint errors occur
4. Monitor the application for any other issues

The order placement should now work correctly without the duplicate key constraint violation!