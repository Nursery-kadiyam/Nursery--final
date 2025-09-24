# 🔧 Corrected Merchant Functions Guide

## 🎯 **Problem Fixed**
The data type mismatch error has been resolved by matching the exact data types from your existing functions.

## 🗄️ **Data Type Analysis**

Looking at your existing functions, I found the correct data types:
- `order_code`: `CHARACTER VARYING` (not `TEXT`)
- `status`: `CHARACTER VARYING` (not `TEXT`)
- `total_amount`: `NUMERIC` (not `DECIMAL`)

## 🔧 **Fixed Functions**

### **1. Simple Fix (`simple_merchant_orders_fix.sql`)**
**Recommended for immediate implementation:**

```sql
get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code CHARACTER VARYING,
    buyer_reference TEXT,
    status CHARACTER VARYING,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    items_count BIGINT,
    order_items JSONB
)
```

### **2. Complete Fix (`corrected_merchant_product_display_functions.sql`)**
**For comprehensive implementation with all functions:**

- `get_merchant_orders_with_products()` - Primary function
- `get_merchant_order_details()` - Order details
- `get_merchant_orders_with_cart_items()` - Fallback function
- `get_merchant_orders_with_quotation_data()` - Quotation data extraction

## 📋 **Implementation Steps**

### **Step 1: Quick Fix (Recommended)**
Run `simple_merchant_orders_fix.sql` first to get the basic function working:

```sql
-- This creates a single function that matches your existing structure
-- and should work immediately without data type errors
```

### **Step 2: Complete Implementation**
If the simple fix works, run `corrected_merchant_product_display_functions.sql` for all functions.

### **Step 3: Test the Functions**
Use the enhanced test file to verify:

1. **Test Enhanced Orders** - Primary function
2. **Test Order Details** - Specific order details
3. **Test Fallback Function** - Cart items fallback
4. **Test Quotation Data** - Quotation JSONB extraction

## 🎯 **How the Fix Works**

### **Data Sources Priority:**
1. **Products Table** - `products.name`, `products.image_url`
2. **Order Items Quotation Data** - `quotation_product_name`, `quotation_product_image`
3. **Quotation Specifications** - `quotation_specifications` JSONB
4. **Fallback** - Placeholder values

### **Product Information Extraction:**
```sql
'product_name', COALESCE(
    p.name,                           -- From products table
    oi.quotation_product_name,       -- From order_items (quotation data)
    'Unknown Product'                 -- Final fallback
),
'product_image', COALESCE(
    p.image_url,                      -- From products table
    oi.quotation_product_image,       -- From order_items (quotation data)
    '/assets/placeholder.svg'         -- Final fallback
),
```

## 🔍 **Expected Results**

### **Before Fix:**
```
ERROR: structure of query does not match function result type
```

### **After Fix:**
```
Order Items:
- Croton Plant (Croton Plant)
  Specifications: {"variety": "Red", "type": "Shrub"}
  Qty: 400 × ₹8 = ₹3,200
  
- Cassia Tree (Cassia Tree)
  Specifications: {"variety": "Golden", "type": "Tree"}
  Qty: 600 × ₹5 = ₹3,000
```

## 🧪 **Testing Checklist**

### **Function Tests:**
- [ ] `get_merchant_orders_with_products` - No data type errors
- [ ] Returns orders with product data
- [ ] Product names display correctly
- [ ] Product images load properly

### **Data Verification:**
- [ ] No "Unknown Product" entries
- [ ] Plant specifications are preserved
- [ ] Order totals are correct
- [ ] Images fallback to placeholder when missing

## 🚀 **Deployment Steps**

1. **Run Simple Fix First:**
   ```sql
   -- Execute simple_merchant_orders_fix.sql
   -- This should work immediately
   ```

2. **Test the Function:**
   ```sql
   SELECT * FROM get_merchant_orders_with_products('MC-2025-TXYR');
   ```

3. **If Simple Fix Works, Run Complete Fix:**
   ```sql
   -- Execute corrected_merchant_product_display_functions.sql
   -- This adds all additional functions
   ```

4. **Test with Frontend:**
   - Update MerchantDashboard.tsx to use the function
   - Verify product names and images display correctly

## 🔧 **Troubleshooting**

### **If Still Getting Data Type Errors:**
1. Check that you're using the corrected SQL files
2. Verify the function was dropped and recreated
3. Check that data types match exactly

### **If Product Names Still Show "Unknown":**
1. Check `order_items.quotation_product_name` has data
2. Verify `products` table has correct `merchant_code` links
3. Test with different merchant codes

### **If Images Not Loading:**
1. Check `order_items.quotation_product_image` has URLs
2. Verify `products.image_url` values
3. Test image fallback to placeholder

## 📊 **Performance Notes**

- **Primary Function:** Fastest, uses indexed columns
- **Quotation Data Function:** Slower, processes JSONB
- **Fallback Function:** Fastest fallback, uses cart_items
- **Order Details:** Optimized for single order queries

## 🎯 **Success Metrics**

After implementation, you should see:
- ✅ No data type errors
- ✅ Product names: "Croton Plant", "Cassia Tree" (not "Unknown Product")
- ✅ Product images: Actual plant images (not placeholders)
- ✅ Specifications: Plant variety, type, age, etc.
- ✅ Order totals: Correct calculations

## 🔧 **Frontend Integration**

The function should work with your existing MerchantDashboard.tsx:

```typescript
const { data: orders, error } = await supabase
    .rpc('get_merchant_orders_with_products', { p_merchant_code: merchantCode });

if (error) {
    console.error('Function error:', error);
    // Handle error
} else {
    setOrders(orders || []);
}
```

The fix ensures that the function returns the correct data types and provides multiple fallback mechanisms for robust product display.