# 🚀 Multi-Merchant Order Management System - Implementation Guide

## 📋 **Overview**

This guide provides step-by-step instructions for implementing a complete multi-merchant order management system where:

1. **Users** place orders by selecting quotations from different merchants
2. **Orders** are automatically assigned to respective merchant dashboards using `MerchantCode`
3. **Merchants** can manage their orders, update status, and view customer details
4. **Each merchant** sees only their own orders with full customer information
5. **Admin** has complete visibility across all merchants and orders

## 🗄️ **Database Setup**

### **Step 1: Run the SQL Script**

First, run the `fix_orders_merchant_code.sql` script in your Supabase SQL Editor:

```sql
-- This script will:
-- 1. Add merchant_code column to orders table
-- 2. Add quotation_code column to orders table  
-- 3. Add order_status and delivery_status columns
-- 4. Create necessary functions for order management
-- 5. Set up RLS policies for security
-- 6. Create indexes for performance
```

### **Step 2: Verify Database Structure**

After running the script, your `orders` table should have these columns:

```sql
orders (
    id UUID PRIMARY KEY,
    user_id UUID,                    -- User who placed the order
    quotation_code TEXT,             -- Links to quotation
    merchant_code TEXT,              -- Which merchant this order is for
    delivery_address JSONB,          -- User's delivery address
    shipping_address TEXT,           -- Shipping address
    total_amount DECIMAL(10,2),      -- Order total
    cart_items JSONB,                -- Items ordered
    status TEXT,                     -- Overall order status
    order_status TEXT,               -- Detailed order status
    delivery_status TEXT,            -- Delivery tracking status
    customer_details JSONB,          -- User contact information
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

## 🔧 **Frontend Implementation**

### **Step 1: Enhanced MerchantDashboard.tsx**

The `MerchantDashboard.tsx` has been updated with:

1. **OrderManagement Component**: Displays orders in a table format with required columns
2. **RecentOrders Component**: Shows recent orders in the dashboard overview
3. **Proper Data Fetching**: Uses RPC functions for better performance and data structure

### **Step 2: Key Features Implemented**

#### **Order Table Columns:**
- ✅ **Order ID**: Unique order identifier
- ✅ **User Info**: Customer name, email, and phone
- ✅ **Product**: Product details from order items
- ✅ **Quantity**: Quantity of each product
- ✅ **Price**: Total amount and unit prices
- ✅ **Status**: Order and delivery status
- ✅ **Actions**: Status update buttons

#### **Status Management:**
- **Pending** → **Confirmed** → **Shipped** → **Delivered**
- **Cancel** option available for non-delivered orders
- Real-time status updates with toast notifications

#### **Data Filtering:**
- Filter orders by status (All, Pending, Confirmed, Shipped, Delivered, Cancelled)
- Refresh button to reload orders
- Proper loading states and error handling

## 🔄 **Order Flow Process**

### **1. User Places Order:**
```typescript
// When user places order from quotations
const { data, error } = await supabase.rpc('create_order_from_quotations', {
    p_user_id: userId,
    p_quotation_code: quotationCode,
    p_selected_merchants: selectedMerchants,
    p_delivery_address: deliveryAddress,
    p_shipping_address: shippingAddress
});
```

### **2. Order Creation:**
- Order is created with `merchant_code` from the quotation
- Customer details are stored in `customer_details` JSONB
- Order status is set to 'pending'
- Delivery status is set to 'pending'

### **3. Merchant Dashboard Display:**
```typescript
// Fetch orders for specific merchant
const { data, error } = await supabase.rpc('get_merchant_orders', {
    p_merchant_code: merchantCode
});
```

### **4. Order Status Updates:**
```typescript
// Update order delivery status
const { data, error } = await supabase.rpc('update_order_delivery_status', {
    p_order_id: orderId,
    p_merchant_code: merchantCode,
    p_delivery_status: newStatus
});
```

## 🧪 **Testing the System**

### **Test File: `test_merchant_orders.html`**

This file provides a comprehensive testing interface for:

1. **Database Connection**: Verify Supabase connection
2. **RPC Functions**: Test `get_merchant_orders` and `update_order_delivery_status`
3. **Table Structure**: Verify required columns exist
4. **Data Flow**: Test complete order management workflow

### **How to Test:**

1. Open `test_merchant_orders.html` in a browser
2. Click "Test Supabase Connection" to verify database access
3. Enter a merchant code and test the `get_merchant_orders` function
4. Test order status updates with valid order IDs
5. Verify the orders table structure

## 🔒 **Security Features**

### **Row Level Security (RLS):**
- Users can only view their own orders
- Merchants can only view orders with their `merchant_code`
- Admin can view all orders across all merchants
- Merchants can only update their own orders

### **Data Validation:**
- `merchant_code` validation before order creation
- User authentication required for all operations
- Input sanitization and validation

## 📊 **Performance Optimizations**

### **Database Indexes:**
```sql
CREATE INDEX idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX idx_orders_quotation_code ON orders(quotation_code);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### **RPC Functions:**
- `get_merchant_orders`: Efficiently fetches orders for specific merchant
- `update_order_delivery_status`: Secure status updates
- `create_order_from_quotations`: Batch order creation

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Orders Not Displaying:**
   - Check if `merchant_code` is properly set in orders table
   - Verify RLS policies are correctly configured
   - Ensure user has proper merchant role

2. **Status Updates Failing:**
   - Verify order exists and belongs to merchant
   - Check if `update_order_delivery_status` function exists
   - Ensure proper permissions

3. **Data Not Loading:**
   - Check Supabase connection
   - Verify RPC functions exist
   - Check browser console for errors

### **Debug Steps:**
1. Use the test file to verify database connectivity
2. Check Supabase logs for function execution errors
3. Verify table structure matches expected schema
4. Test RPC functions individually

## 🎯 **Next Steps**

### **Immediate Actions:**
1. ✅ Run the SQL script in Supabase
2. ✅ Test the system using `test_merchant_orders.html`
3. ✅ Verify orders appear in merchant dashboard
4. ✅ Test order status updates

### **Future Enhancements:**
- Add email notifications for status changes
- Implement order tracking system
- Add analytics and reporting features
- Create mobile-responsive order management interface

## 📞 **Support**

If you encounter any issues:

1. Check the troubleshooting section above
2. Use the test file to isolate problems
3. Verify database structure matches requirements
4. Check Supabase logs for detailed error messages

---

**🎉 Congratulations!** You now have a fully functional multi-merchant order management system that ensures each merchant only sees orders linked to their `MerchantCode`.
