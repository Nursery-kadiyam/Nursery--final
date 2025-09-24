# 🔧 New Order Merchant Linking Fix Guide

## 🚨 **Problem Identified**

New orders placed by users are not showing details properly in the merchant dashboard because:

1. **Orders are created with 'admin' merchant_code** instead of the actual merchant code
2. **Frontend is hardcoding merchant_code as 'admin'** instead of fetching from quotation
3. **Order creation function doesn't properly link to merchants** from quotations
4. **Merchant dashboard can't find orders** because they're linked to wrong merchant codes

## 🔍 **Root Causes**

1. **Frontend Issue**: `OrderSummaryPage.tsx` hardcodes `p_merchant_code: 'admin'`
2. **Database Issue**: Order creation function doesn't fetch merchant code from quotation
3. **Linking Issue**: Orders are not properly linked to the correct merchant

## ✅ **Solution**

### **Step 1: Database Fix**

Run the SQL script `fix_new_order_merchant_linking.sql` in your Supabase SQL Editor:

```sql
-- Update order creation function to properly link to merchants
-- This will be handled by the SQL script

-- Fix existing orders with wrong merchant codes
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND orders.merchant_code = 'admin'
AND q.merchant_code IS NOT NULL;
```

### **Step 2: Frontend Fix**

The following files have been updated:

1. **`src/pages/OrderSummaryPage.tsx`**:
   - Added logic to fetch merchant code from quotation
   - Updated order creation to use actual merchant code
   - Fixed both main order creation and fallback logic

### **Step 3: Database Function Updates**

Updated the following functions:

1. **`create_or_update_simple_order`** - Now properly links to merchant codes
2. **`create_order_from_quotations`** - Now uses actual merchant codes

## 📋 **Files Created/Updated**

1. **`fix_new_order_merchant_linking.sql`** - Database fixes and function updates
2. **`fix_merchant_order_display.sql`** - Additional merchant linking fixes
3. **`src/pages/OrderSummaryPage.tsx`** - Frontend fixes for merchant code fetching
4. **`test_merchant_order_fix.html`** - Test interface to verify the fix
5. **`NEW_ORDER_MERCHANT_LINKING_FIX_GUIDE.md`** - This guide

## 🧪 **Testing the Fix**

1. **Open the test file**: `test_merchant_order_fix.html` in your browser
2. **Update Supabase credentials**: Replace the placeholder URLs and keys
3. **Run the tests**:
   - Test database connection
   - Check order-merchant linking
   - Test merchant orders with specific merchant codes
   - Fix order-merchant linking
   - Test new order creation

## 🔄 **Expected Results After Fix**

- ✅ New orders are created with correct merchant codes
- ✅ Orders appear in the correct merchant dashboard
- ✅ Order details are properly fetched and displayed
- ✅ Merchant dashboard shows all orders for that merchant
- ✅ Order creation function properly links to merchants

## ⚠️ **Important Notes**

1. **Backup your data** before running the database fixes
2. **Test in development** before applying to production
3. **Verify merchant codes** in quotations table
4. **Monitor order creation** after applying the fix

## 🚀 **Quick Commands**

If you want to apply the fix immediately, run these commands in your Supabase SQL Editor:

```sql
-- Quick fix for order-merchant linking
UPDATE orders 
SET merchant_code = q.merchant_code,
    updated_at = NOW()
FROM quotations q 
WHERE orders.quotation_code = q.quotation_code
AND orders.merchant_code = 'admin'
AND q.merchant_code IS NOT NULL;

-- Check the results
SELECT merchant_code, COUNT(*) as count 
FROM orders 
GROUP BY merchant_code 
ORDER BY merchant_code;
```

## 🎯 **Next Steps**

After applying the fix:
1. Test order placement in your application
2. Verify that orders appear in the correct merchant dashboard
3. Check that order details are properly displayed
4. Monitor the application for any other issues

The new orders should now be properly linked to merchants and display correctly in the merchant dashboard!