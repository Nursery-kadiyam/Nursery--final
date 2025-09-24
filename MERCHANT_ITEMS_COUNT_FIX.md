# 🔧 FIX: Merchant Dashboard Items Count Issue

## 🎯 **Problem Identified**
The merchant dashboard was showing "0 items" for all orders because:
1. The `getCartItems` function was only looking at `order.cart_items`
2. The new database function returns items in `order.order_items`
3. The fetch function wasn't using the enhanced database function

## ✅ **Solution Applied**

### **1. Updated `getCartItems` Function**
**File:** `src/pages/ProfessionalMerchantDashboard.tsx`

**Before:**
```typescript
const getCartItems = (order: any) => {
  if (!order.cart_items) return [];
  
  try {
    return typeof order.cart_items === 'string' 
      ? JSON.parse(order.cart_items) 
      : order.cart_items;
  } catch (e) {
    console.error('Error parsing cart items:', e);
    return [];
  }
};
```

**After:**
```typescript
const getCartItems = (order: any) => {
  // First try to get items from order_items (preferred method)
  if (order.order_items && Array.isArray(order.order_items)) {
    console.log('Using order_items from database function');
    return order.order_items.map((item: any) => ({
      id: item.id,
      name: item.product_name || 'Unknown Product',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      price: item.subtotal || (item.unit_price * item.quantity) || 0,
      image: item.product_image || '/assets/placeholder.svg',
      product_id: item.product_id
    }));
  }
  
  // Fallback to cart_items if order_items is not available
  if (order.cart_items) {
    console.log('Using cart_items as fallback');
    try {
      return typeof order.cart_items === 'string' 
        ? JSON.parse(order.cart_items) 
        : order.cart_items;
    } catch (e) {
      console.error('Error parsing cart items:', e);
      return [];
    }
  }
  
  return [];
};
```

### **2. Updated `fetchOrders` Function**
**File:** `src/pages/ProfessionalMerchantDashboard.tsx`

**Before:** Used direct table queries
**After:** Uses the enhanced database function `get_merchant_orders_with_products`

```typescript
// Use the enhanced database function that includes order_items
const { data: ordersData, error: ordersError } = await supabase
  .rpc('get_merchant_orders_with_products', { 
    p_merchant_code: merchantInfo.merchant_code 
  });
```

## 🎯 **Expected Results**

After applying this fix:

### **✅ Items Count Will Show Correctly:**
- **Before:** "0 items" for all orders
- **After:** Actual item count (e.g., "2 items", "3 items")

### **✅ Plant Names & Images Will Display:**
- Real plant names instead of "Unknown Product"
- Actual plant images from your assets folder
- Correct quantities and prices

### **✅ Database Integration:**
- Uses the enhanced `get_merchant_orders_with_products` function
- Properly processes `order_items` data
- Maintains fallback to `cart_items` for compatibility

## 🧪 **Testing the Fix**

1. **Refresh your merchant dashboard**
2. **Check the "Items" column** - should now show correct counts
3. **Click on order details** - should show plant names and images
4. **Verify console logs** - should see "Using order_items from database function"

## 📊 **What This Fixes**

- ✅ **Item Count Display**: Shows actual number of items per order
- ✅ **Plant Names**: Displays real plant names from database
- ✅ **Plant Images**: Shows correct product images
- ✅ **Data Consistency**: Uses the enhanced database function
- ✅ **Backward Compatibility**: Maintains fallback for old data

The merchant dashboard will now correctly display item counts and show the actual plant names and images for all orders! 🌱✨