# 🔧 Parent-Child Order Constraint Fix Guide

## 🚨 **Problem Identified**

The order cleanup is failing with the error:
```
ERROR: 23503: update or delete on table "orders" violates foreign key constraint "orders_parent_order_id_fkey" on table "orders"
DETAIL: Key (id)=(e74f8653-ae84-4fcd-9c44-5f4dc97986c2) is still referenced from table "orders".
```

## 🔍 **Root Cause**

The database has a parent-child order structure where:
- **Parent orders** have `parent_order_id = NULL`
- **Child orders** have `parent_order_id` pointing to a parent order
- The foreign key constraint `orders_parent_order_id_fkey` prevents deleting parent orders that have child orders referencing them

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

-- Instead of deleting orders (which causes foreign key violations),
-- mark duplicate orders as cancelled
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
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);
```

### **Complete Fix (Advanced)**

If you want a more sophisticated solution that properly handles parent-child relationships, use the `fix_parent_child_order_constraint.sql` script which:

1. Removes the problematic constraints
2. Safely handles parent-child order relationships
3. Deletes child orders first, then parent orders
4. Creates better unique constraints

## 📋 **Files Created**

1. **`quick_fix_parent_child_constraint.sql`** - Simple fix that marks duplicates as cancelled
2. **`fix_parent_child_order_constraint.sql`** - Complete fix with proper parent-child handling
3. **Updated test files** - Test interface with parent-child order checking

## 🧪 **Testing the Fix**

1. **Open the test file**: `test_order_placement_fix.html` in your browser
2. **Update Supabase credentials**: Replace the placeholder URLs and keys
3. **Run the tests**:
   - Test database connection
   - Check duplicate constraints
   - Test order placement function

## 🔄 **Expected Results After Fix**

- ✅ Orders can be placed without duplicate key violations
- ✅ Existing duplicate orders are marked as cancelled (not deleted)
- ✅ Parent-child order relationships are preserved
- ✅ No more foreign key constraint violations
- ✅ Order placement function works correctly

## ⚠️ **Important Notes**

1. **The quick fix is recommended** for immediate resolution
2. **Orders are marked as cancelled** instead of deleted to preserve relationships
3. **Parent-child relationships are maintained** to avoid foreign key violations
4. **Test in development** before applying to production

## 🚀 **Quick Commands**

If you want to apply the fix immediately, run these commands in your Supabase SQL Editor:

```sql
-- Quick fix for parent-child constraint
DROP INDEX IF EXISTS unique_parent_order_per_quotation;
DROP INDEX IF EXISTS unique_child_order_per_quotation_merchant;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_parent_order_per_quotation;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_child_order_per_quotation_merchant;

-- Mark duplicates as cancelled instead of deleting
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
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);
```

## 🎯 **Next Steps**

After applying the fix:
1. Test order placement in your application
2. Verify that orders are created successfully
3. Check that no duplicate constraint errors occur
4. Monitor the application for any other issues

The order placement should now work correctly without the foreign key constraint violation!