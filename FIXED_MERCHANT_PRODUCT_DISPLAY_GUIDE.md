# 🔧 Fixed Merchant Product Display Guide

## 🎯 **Problem Solved**
This guide fixes the "Unknown Product" issue in merchant dashboards by working with your actual database schema.

## 🗄️ **Database Schema Analysis**

Based on your schema, the key tables are:
- `orders` - Contains order information with `merchant_code`
- `order_items` - Contains order line items with quotation data
- `products` - Contains product information
- `quotations` - Contains quotation data as JSONB in `items` column

## 🔧 **Fixed SQL Functions**

### **1. Enhanced Function (Primary)**
```sql
get_merchant_orders_with_products(p_merchant_code TEXT)
```
**Data Sources:**
- `products.name` (primary)
- `order_items.quotation_product_name` (from quotations)
- `order_items.quotation_product_image` (from quotations)
- `order_items.quotation_specifications` (JSONB specs)

### **2. Order Details Function**
```sql
get_merchant_order_details(p_order_id UUID, p_merchant_code TEXT)
```
**Purpose:** Get detailed information for a specific order

### **3. Fallback Function**
```sql
get_merchant_orders_with_cart_items(p_merchant_code TEXT)
```
**Purpose:** Uses `cart_items` JSONB as fallback when order_items are incomplete

### **4. Quotation Data Function**
```sql
get_merchant_orders_with_quotation_data(p_merchant_code TEXT)
```
**Purpose:** Extracts data from quotations table JSONB items

## 📋 **Implementation Steps**

### **Step 1: Run the Fixed SQL**
Execute `fixed_merchant_product_display_functions.sql` in Supabase SQL Editor.

### **Step 2: Test the Functions**
Use the enhanced test file to verify all functions work:

1. **Test All Functions** - Comprehensive test of all 4 functions
2. **Test Enhanced Orders** - Primary function with product data
3. **Test Order Details** - Specific order details
4. **Test Fallback Function** - Cart items fallback
5. **Test Quotation Data** - Quotation JSONB extraction

### **Step 3: Update Frontend**
The MerchantDashboard.tsx should work with these functions:

```typescript
// Primary function (recommended)
const { data: orders, error } = await supabase
    .rpc('get_merchant_orders_with_products', { p_merchant_code: merchantCode });

// Fallback if primary fails
if (error) {
    const { data: fallbackOrders } = await supabase
        .rpc('get_merchant_orders_with_cart_items', { p_merchant_code: merchantCode });
    setOrders(fallbackOrders || []);
}
```

## 🎯 **How the Fix Works**

### **Data Flow Priority:**
1. **Products Table** - `products.name`, `products.image_url`
2. **Order Items Quotation Data** - `quotation_product_name`, `quotation_product_image`
3. **Quotation Specifications** - `quotation_specifications` JSONB
4. **Fallback** - Cart items or placeholder

### **Product Information Sources:**
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
Order Items:
- Unknown Product (Unknown Product)
- Unknown Product (Unknown Product)
```

### **After Fix:**
```
Order Items:
- Croton Plant (Croton Plant)
  Specifications: {"variety": "Red", "type": "Shrub", "age": "1-2 years"}
  Qty: 400 × ₹8 = ₹3,200
  
- Cassia Tree (Cassia Tree)
  Specifications: {"variety": "Golden", "type": "Tree", "age": "2-3 years"}
  Qty: 600 × ₹5 = ₹3,000
```

## 🧪 **Testing Checklist**

### **Function Tests:**
- [ ] `get_merchant_orders_with_products` - Returns orders with product data
- [ ] `get_merchant_order_details` - Returns specific order details
- [ ] `get_merchant_orders_with_cart_items` - Fallback using cart items
- [ ] `get_merchant_orders_with_quotation_data` - Extracts from quotations JSONB

### **Data Verification:**
- [ ] Product names display correctly (not "Unknown Product")
- [ ] Product images load properly
- [ ] Quotation specifications are preserved
- [ ] Order totals are correct

### **Error Handling:**
- [ ] Functions handle missing data gracefully
- [ ] Fallbacks work when primary data is unavailable
- [ ] Images fallback to placeholder when missing

## 🚀 **Deployment Steps**

1. **Run SQL Fix:**
   ```sql
   -- Execute fixed_merchant_product_display_functions.sql
   ```

2. **Test Functions:**
   ```html
   <!-- Open test_merchant_dashboard_fix_enhanced.html -->
   <!-- Update Supabase credentials -->
   <!-- Run all tests -->
   ```

3. **Verify Results:**
   - Check merchant dashboard shows correct product names
   - Verify images load properly
   - Confirm specifications are displayed

## 🔧 **Troubleshooting**

### **If Still Seeing "Unknown Product":**
1. Check if `order_items.quotation_product_name` has data
2. Verify `products` table has correct `merchant_code` links
3. Test fallback function with cart items
4. Check quotation data extraction

### **If Images Not Loading:**
1. Verify `order_items.quotation_product_image` has URLs
2. Check `products.image_url` values
3. Test image fallback to placeholder
4. Verify image URLs are accessible

### **If Specifications Missing:**
1. Check `order_items.quotation_specifications` JSONB data
2. Verify quotation data extraction function
3. Test with different merchant codes

## 📊 **Performance Notes**

- **Primary Function:** Fastest, uses indexed columns
- **Quotation Data Function:** Slower, processes JSONB
- **Fallback Function:** Fastest fallback, uses cart_items
- **Order Details:** Optimized for single order queries

## 🎯 **Success Metrics**

After implementation, you should see:
- ✅ Product names: "Croton Plant", "Cassia Tree" (not "Unknown Product")
- ✅ Product images: Actual plant images (not placeholders)
- ✅ Specifications: Plant variety, type, age, etc.
- ✅ Order totals: Correct calculations
- ✅ Error handling: Graceful fallbacks

The fix is designed to work with your existing database schema and provide multiple fallback mechanisms for robust product display.