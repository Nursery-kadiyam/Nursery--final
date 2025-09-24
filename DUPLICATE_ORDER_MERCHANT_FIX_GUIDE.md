# 🔧 Duplicate Order-Merchant Fix Guide

## 🚨 **Problem Identified**

The SQL script failed with a PostgreSQL syntax error, and the query results show that there are duplicate orders with multiple merchant codes for the same order code.

## 🔍 **Root Causes**

1. **SQL Syntax Error**: PostgreSQL doesn't support `(id::text)[-4:]` syntax for string slicing
2. **Duplicate Orders**: Same order code appears with different merchant codes
3. **Inconsistent Linking**: Orders are not properly linked to single merchant codes

## ✅ **Solution**

### **Step 1: Fix SQL Syntax Error**

The corrected SQL script `fix_merchant_order_display_corrected.sql` fixes the syntax error:

```sql
-- OLD (INCORRECT):
LPAD((id::text)[-4:], 4, '0')

-- NEW (CORRECT):
LPAD(RIGHT(id::text, 4), 4, '0')
```

### **Step 2: Fix Duplicate Orders**

Run the `fix_duplicate_order_merchant_issue.sql` script to:

1. **Remove duplicate orders** - Keep only the most recent one for each order code
2. **Fix merchant code assignment** - Ensure each order has the correct merchant code
3. **Generate missing order codes** - Create order codes for orders that don't have them

### **Step 3: Quick Fix**

For immediate resolution, run this in your Supabase SQL Editor:

```sql
-- Remove duplicate orders
WITH duplicate_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY order_code 
            ORDER BY created_at DESC, updated_at DESC
        ) as rn
    FROM orders 
    WHERE order_code IS NOT NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);

-- Fix merchant code assignment
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND q.merchant_code IS NOT NULL
AND orders.merchant_code != q.merchant_code;
```

## 📋 **Files Created**

1. **`fix_merchant_order_display_corrected.sql`** - Fixed SQL script with correct PostgreSQL syntax
2. **`quick_fix_merchant_linking.sql`** - Simple fix for immediate resolution
3. **`fix_duplicate_order_merchant_issue.sql`** - Comprehensive fix for duplicate orders
4. **`DUPLICATE_ORDER_MERCHANT_FIX_GUIDE.md`** - This guide

## 🧪 **Testing the Fix**

1. **Run the corrected SQL script** in your Supabase SQL Editor
2. **Check for duplicate orders** - Each order code should appear only once
3. **Verify merchant codes** - Each order should have the correct merchant code
4. **Test merchant dashboard** - Orders should appear in the correct merchant dashboard

## 🔄 **Expected Results After Fix**

- ✅ No more SQL syntax errors
- ✅ Each order code appears only once
- ✅ Orders have correct merchant codes
- ✅ Merchant dashboard shows orders correctly
- ✅ No duplicate orders in the system

## ⚠️ **Important Notes**

1. **Backup your data** before running the duplicate removal
2. **Test in development** before applying to production
3. **Verify order codes** after the fix
4. **Monitor the application** for any other issues

## 🚀 **Quick Commands**

If you want to fix this immediately, run these commands in your Supabase SQL Editor:

```sql
-- Quick fix for duplicate orders
WITH duplicate_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY order_code 
            ORDER BY created_at DESC, updated_at DESC
        ) as rn
    FROM orders 
    WHERE order_code IS NOT NULL
)
DELETE FROM orders 
WHERE id IN (
    SELECT id FROM duplicate_orders WHERE rn > 1
);

-- Fix merchant codes
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND q.merchant_code IS NOT NULL;
```

## 🎯 **Next Steps**

After applying the fix:
1. **Verify no duplicate orders** - Each order code should appear only once
2. **Check merchant codes** - Orders should have correct merchant codes
3. **Test merchant dashboard** - Orders should appear in correct merchant dashboards
4. **Monitor order creation** - New orders should not create duplicates

The duplicate order issue should now be resolved and orders should display correctly in the merchant dashboard!