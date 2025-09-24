# Order Split View Implementation Guide

## 🎯 **EXACTLY WHAT YOU REQUESTED**

I've implemented exactly what you asked for:

### **My Orders List** (No Change)
- ✅ **Shows parent orders only** - Same as current behavior
- ✅ **One entry per checkout** - Each parent order appears once
- ✅ **Parent order number** - Order #ORD-2025-0003
- ✅ **Date/time placed** - Sep 19, 2025, 01:37 AM
- ✅ **Status** - "Pending", "Partially Shipped", "Completed"
- ✅ **Grand total amount** - Sum of all merchant child orders
- ✅ **"View Details" button** - Click to see merchant split

### **Order Details Dialog** (Enhanced with Merchant Split)
- ✅ **Parent order info** - ID, date, total, delivery address
- ✅ **Child orders grouped by merchant** - Each merchant gets their own section
- ✅ **Merchant name** - Shows actual nursery/merchant name
- ✅ **Child order number** - Individual order codes per merchant
- ✅ **Status per merchant** - Each merchant can have different status
- ✅ **Subtotal per merchant** - Amount for that merchant's portion
- ✅ **Items per merchant** - Only items belonging to that merchant
- ✅ **Combined total** - Sum of all merchant subtotals
- ✅ **Delivery address** - Shared across all merchants

## 🚀 **IMPLEMENTATION**

### **Step 1: Replace Your Orders Page**
Replace your current `Orders.tsx` with `EnhancedOrdersWithSplit.tsx`:

```typescript
// In your routing file (App.tsx or similar)
import EnhancedOrdersWithSplit from './pages/EnhancedOrdersWithSplit';

// Replace the route
<Route path="/orders" element={<EnhancedOrdersWithSplit />} />
```

### **Step 2: Update Navigation**
Update any navigation links:
```typescript
<Link to="/orders">My Orders</Link>
```

## 🎨 **NEW FEATURES**

### **Parent Order List** (Unchanged)
- Shows parent orders exactly as before
- One row per checkout/order
- Status shows overall order status
- Total shows combined amount

### **Enhanced Order Details** (New Merchant Split View)
- **Parent Order Section** - Blue header with order info
- **Merchant Split Section** - Each merchant gets their own card
- **Expandable Merchant Cards** - Click to see details
- **Merchant Information** - Name, email, phone, address
- **Child Order Details** - Individual order codes and status
- **Item Breakdown** - Items per merchant
- **Order Summary** - Combined total at bottom

## 📊 **ORDER STATUS LOGIC**

### **Parent Order Status**
- **"Pending"** - All child orders are pending
- **"Partially Shipped"** - Some merchants have shipped
- **"Completed"** - All merchants have delivered
- **"Processing"** - Some merchants are processing
- **"Confirmed"** - Some merchants have confirmed

### **Child Order Status** (Per Merchant)
- Each merchant can have different status
- Independent tracking per merchant
- Shows actual merchant order status

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Order Fetching**
```typescript
// Fetch parent orders only
const { data } = await supabase
  .from("orders")
  .select("*")
  .eq("user_id", user.id)
  .is("parent_order_id", null) // Only parent orders
  .order("created_at", { ascending: false });
```

### **Child Orders Fetching** (On Details Click)
```typescript
// Fetch child orders for parent
const { data: children } = await supabase
  .from("orders")
  .select("*")
  .eq("parent_order_id", parentOrderId)
  .order("created_at", { ascending: true });
```

### **Merchant Details Fetching**
```typescript
// Fetch merchant information
const { data: merchant } = await supabase
  .from('merchants')
  .select('full_name, nursery_name, email, phone_number, nursery_address')
  .eq('merchant_code', merchantCode)
  .single();
```

## 🎯 **USER EXPERIENCE**

### **Order List View**
1. **User sees parent orders** - Same as before
2. **Clicks "View Details"** - Opens enhanced dialog
3. **Sees merchant split** - Each merchant's portion
4. **Expands merchant cards** - Click to see details
5. **Views order summary** - Combined total

### **Order Details View**
1. **Parent Order Info** - Blue header with order details
2. **Merchant Split** - Each merchant gets their own section
3. **Expandable Cards** - Click to see merchant details
4. **Item Breakdown** - Items per merchant
5. **Order Summary** - Total amount at bottom

## 📋 **EXPECTED RESULTS**

After implementation:
- ✅ **Order list unchanged** - Same parent order display
- ✅ **Enhanced details** - Merchant split view
- ✅ **Better organization** - Clear merchant separation
- ✅ **Complete information** - All order details visible
- ✅ **Professional design** - Clean, modern interface

## 🧪 **TESTING CHECKLIST**

- [ ] Replace Orders.tsx with EnhancedOrdersWithSplit.tsx
- [ ] Test order list display (should be same as before)
- [ ] Test "View Details" button
- [ ] Test merchant split view
- [ ] Test expandable merchant cards
- [ ] Test order status display
- [ ] Test delivery address display
- [ ] Test order summary

## 🚀 **QUICK START**

1. **Replace** `Orders.tsx` with `EnhancedOrdersWithSplit.tsx`
2. **Update** your routing to use the new component
3. **Test** the order list (should look the same)
4. **Test** the order details (should show merchant split)
5. **Customize** styling if needed

The implementation is exactly what you requested - parent orders in the list, merchant split in the details! 🎉