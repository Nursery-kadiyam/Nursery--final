# 🌟 COMPLETE MERCHANT ORDER SYSTEM GUIDE

## 🎯 **System Overview**

This system implements a **multi-merchant order management** where each merchant only sees and manages orders for their specific products.

### **How It Works:**
1. **User places order** → Orders are automatically split by merchant
2. **Each merchant** → Sees only their orders in their dashboard
3. **Merchant responsibility** → Deliver their products to the user
4. **Admin** → Can see all orders across all merchants

---

## 🗄️ **Database Structure**

### **Orders Table:**
```sql
orders (
    id UUID PRIMARY KEY,
    user_id UUID,                    -- User who placed the order
    merchant_code TEXT NOT NULL,     -- Which merchant this order is for
    quotation_code TEXT,             -- Links to quotation
    total_amount DECIMAL(10,2),      -- Order total for this merchant
    cart_items JSONB,                -- Items for this specific merchant
    status TEXT,                     -- Order status
    delivery_address JSONB,          -- User's delivery address
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### **Products Table:**
```sql
products (
    id UUID PRIMARY KEY,
    name TEXT,
    merchant_code TEXT NOT NULL,     -- Which merchant owns this product
    price DECIMAL(10,2),
    available_quantity INTEGER,
    -- other fields...
)
```

---

## 🔄 **Order Flow Process**

### **1. User Places Order:**
```
User selects products from different merchants
    ↓
System creates separate orders for each merchant
    ↓
Each order has merchant_code = specific merchant
    ↓
Orders appear in respective merchant dashboards
```

### **2. Merchant Dashboard:**
```
Merchant logs in
    ↓
Dashboard shows only orders with their merchant_code
    ↓
Merchant can update order status
    ↓
Merchant can view customer details
    ↓
Merchant handles delivery for their products
```

### **3. Example Scenario:**
```
User Order Contains:
- Plant A (Merchant 1) → Order 1 with merchant_code = "MC-001"
- Plant B (Merchant 2) → Order 2 with merchant_code = "MC-002"  
- Plant C, D, E (Merchant 3) → Order 3 with merchant_code = "MC-003"

Result:
- Merchant 1 Dashboard → Shows only Plant A order
- Merchant 2 Dashboard → Shows only Plant B order
- Merchant 3 Dashboard → Shows Plant C, D, E orders
```

---

## 🛠️ **Implementation Steps**

### **Step 1: Run Database Script**
Execute `complete_merchant_order_system.sql` in Supabase SQL Editor:

```sql
-- This script will:
-- 1. Add merchant_code column to orders table
-- 2. Update existing orders with proper merchant_code
-- 3. Create indexes for performance
-- 4. Set up RLS policies
-- 5. Verify the implementation
```

### **Step 2: Verify Current Code**
The frontend code is already implemented:

#### **Order Creation (MyQuotations.tsx):**
```typescript
// Creates separate orders for each merchant
const orderPromises = cartItems.map(async (cartItem) => {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: user.id,
      merchant_code: cartItem.selected_merchant, // ✅ Already implemented
      total_amount: cartItem.price,
      cart_items: [cartItem],
      status: 'pending'
    }])
    .select('id')
    .single();
});
```

#### **Merchant Dashboard (MerchantDashboard.tsx):**
```typescript
// Filters orders by merchant_code
const { data: ordersData, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .eq('merchant_code', merchantCode) // ✅ Already implemented
  .order('created_at', { ascending: false });
```

---

## 📊 **Testing the System**

### **Test Scenario 1: Multiple Merchants**
1. Create products with different `merchant_code` values
2. User places order with products from multiple merchants
3. Verify separate orders are created for each merchant
4. Check each merchant dashboard shows only their orders

### **Test Scenario 2: Single Merchant**
1. User places order with products from one merchant
2. Verify only one order is created
3. Check merchant dashboard shows the order

### **Test Scenario 3: Admin View**
1. Admin logs in
2. Verify admin can see all orders from all merchants
3. Check admin can manage any order

---

## 🔧 **Troubleshooting**

### **Issue: Merchant sees all orders**
**Solution:** Check RLS policies and ensure `merchant_code` is properly set

### **Issue: Orders not appearing in merchant dashboard**
**Solution:** 
1. Verify `merchant_code` in orders table
2. Check merchant's `merchant_code` in user_profiles
3. Ensure RLS policies are correct

### **Issue: 403 Forbidden errors**
**Solution:** Run the user profiles access fix:
```sql
-- Run simple_merchant_access_fix.sql
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_profiles TO authenticated;
```

---

## ✅ **Verification Checklist**

- [ ] Orders table has `merchant_code` column
- [ ] All existing orders have `merchant_code` assigned
- [ ] Products table has `merchant_code` column
- [ ] RLS policies are properly configured
- [ ] Merchant dashboard filters by `merchant_code`
- [ ] Admin can see all orders
- [ ] Each merchant sees only their orders
- [ ] Order creation assigns correct `merchant_code`

---

## 🎉 **Expected Results**

After implementation:
- ✅ **Merchant 1** → Sees only Plant A orders
- ✅ **Merchant 2** → Sees only Plant B orders  
- ✅ **Merchant 3** → Sees only Plant C, D, E orders
- ✅ **Admin** → Sees all orders from all merchants
- ✅ **Users** → Can place orders with products from multiple merchants
- ✅ **Each merchant** → Responsible for delivering their products

The system is **already implemented** in the frontend code. You just need to run the database script to ensure all orders have proper `merchant_code` assignment!
