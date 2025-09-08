# 🚨 QUICK FIX: Merchant Orders Error

## **Problem:**
```
Error: column up.user_id does not exist
```

## **Root Cause:**
The `get_merchant_orders` RPC function is trying to join with `user_profiles` table using a column that doesn't exist.

## **Immediate Fix:**

### **Step 1: Run this SQL in Supabase SQL Editor**
```sql
-- Drop the broken function
DROP FUNCTION IF EXISTS get_merchant_orders(TEXT);

-- Create a working version
CREATE OR REPLACE FUNCTION get_merchant_orders(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    quotation_code TEXT,
    user_email TEXT,
    customer_name TEXT,
    items JSONB,
    total_amount DECIMAL(10,2),
    order_status TEXT,
    delivery_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.quotation_code,
        o.customer_details->>'email' as user_email,
        COALESCE(
            o.customer_details->>'customer_name',
            o.customer_details->>'name',
            'Unknown Customer'
        ) as customer_name,
        o.cart_items as items,
        o.total_amount,
        COALESCE(o.order_status, o.status, 'pending') as order_status,
        COALESCE(o.delivery_status, 'pending') as delivery_status,
        o.created_at,
        o.customer_details->>'phone' as customer_phone
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders(TEXT) TO authenticated;
```

### **Step 2: Alternative - Use Direct Query (No RPC)**
If the function still doesn't work, the MerchantDashboard now has a fallback that works directly with the orders table.

## **What This Fixes:**
1. ✅ Removes the broken `up.user_id` reference
2. ✅ Uses only the `orders` table (no joins)
3. ✅ Extracts customer info from `customer_details` JSONB
4. ✅ Provides fallback to direct queries

## **Test:**
1. Run the SQL above
2. Refresh your merchant dashboard
3. Check the Orders tab
4. Verify orders are displaying correctly

## **If Still Having Issues:**
The MerchantDashboard now automatically falls back to direct queries, so orders should display even without the RPC function.






