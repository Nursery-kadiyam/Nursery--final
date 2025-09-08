# 🌟 MULTI-MERCHANT ORDER MANAGEMENT SYSTEM GUIDE

## 🎯 **Overview**

This system implements a complete order management solution for multiple merchants where:

1. **Users** can place orders by selecting quotations from different merchants
2. **Orders** are automatically assigned to respective merchant dashboards
3. **Merchants** can manage their orders, update status, and view customer details
4. **Admin** has complete visibility across all merchants and orders
5. **Each merchant** sees only their own orders with full customer information

## 🗄️ **Database Structure**

### **Enhanced Orders Table:**
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

### **Order Items Table:**
```sql
order_items (
    id UUID PRIMARY KEY,
    order_id UUID,                   -- References main order
    product_id UUID,                 -- Product reference
    merchant_code TEXT,              -- Which merchant supplies this item
    quantity INTEGER,                -- Quantity ordered
    unit_price DECIMAL(10,2),       -- Price per unit
    total_price DECIMAL(10,2),      -- Total for this item
    created_at TIMESTAMP
)
```

## 🔄 **Order Flow Process**

### **1. User Places Order:**
1. User selects quotations from different merchants
2. System calls `create_order_from_quotations()` function
3. Creates separate order records for each merchant
4. Links all orders with same `quotation_code`
5. Orders appear in respective merchant dashboards

### **2. Merchant Order Management:**
1. Merchant logs into dashboard
2. Sees only their orders via `get_merchant_orders()` function
3. Can update delivery status via `update_order_delivery_status()`
4. Views complete customer information
5. Manages order fulfillment

### **3. Admin Monitoring:**
1. Admin sees all orders across merchants
2. Uses `get_all_orders_admin()` function
3. Complete visibility of which user ordered from which merchant
4. Can monitor order status and delivery progress

## 🚀 **Setup Instructions**

### **Step 1: Run the SQL Script**
1. Open your Supabase SQL Editor
2. Copy and paste the entire `fix_orders_merchant_code.sql` script
3. Execute the script
4. Verify all columns and functions are created successfully

### **Step 2: Verify Setup**
The script will show:
- ✅ All required columns exist
- ✅ Functions created successfully
- ✅ Indexes created for performance
- ✅ RLS policies configured

## 📱 **Frontend Implementation**

### **1. User Order Placement:**
```typescript
// When user confirms quotation selections
const placeOrder = async (quotationCode: string, selectedMerchants: any[]) => {
    const { data, error } = await supabase.rpc('create_order_from_quotations', {
        p_user_id: user.id,
        p_quotation_code: quotationCode,
        p_selected_merchants: selectedMerchants,
        p_delivery_address: deliveryAddress,
        p_shipping_address: shippingAddress
    });
    
    if (data?.success) {
        // Order created successfully
        // Redirect to My Orders page
    }
};
```

### **2. Merchant Dashboard Orders:**
```typescript
// Fetch merchant orders
const fetchMerchantOrders = async (merchantCode: string) => {
    const { data, error } = await supabase.rpc('get_merchant_orders', {
        p_merchant_code: merchantCode
    });
    
    if (data) {
        setOrders(data);
    }
};

// Update delivery status
const updateDeliveryStatus = async (orderId: string, status: string) => {
    const { data, error } = await supabase.rpc('update_order_delivery_status', {
        p_order_id: orderId,
        p_merchant_code: merchantCode,
        p_delivery_status: status
    });
    
    if (data?.success) {
        // Status updated, refresh orders
        fetchMerchantOrders(merchantCode);
    }
};
```

### **3. Admin Dashboard:**
```typescript
// Fetch all orders for admin
const fetchAllOrders = async () => {
    const { data, error } = await supabase.rpc('get_all_orders_admin');
    
    if (data) {
        setAllOrders(data);
    }
};
```

## 🎨 **UI Components**

### **1. Merchant Orders Table:**
```tsx
const MerchantOrdersTable = ({ orders }) => {
    const statusOptions = ['pending', 'processing', 'shipped', 'delivered'];
    
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Delivery</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order.order_id}>
                            <td>{order.quotation_code}</td>
                            <td>
                                <div>
                                    <div>{order.customer_name}</div>
                                    <div className="text-sm text-gray-500">
                                        {order.user_email}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {order.customer_phone}
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="max-w-xs">
                                    {JSON.parse(order.items).map((item, index) => (
                                        <div key={index} className="text-sm">
                                            {item.name} x {item.quantity}
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td>₹{order.total_amount}</td>
                            <td>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.order_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                    order.order_status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {order.order_status}
                                </span>
                            </td>
                            <td>
                                <select 
                                    value={order.delivery_status}
                                    onChange={(e) => updateDeliveryStatus(order.order_id, e.target.value)}
                                    className="border rounded px-2 py-1 text-sm"
                                >
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <button 
                                    onClick={() => viewOrderDetails(order)}
                                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                                >
                                    View Details
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
```

### **2. Admin Orders Overview:**
```tsx
const AdminOrdersOverview = ({ orders }) => {
    const merchantStats = useMemo(() => {
        const stats = {};
        orders.forEach(order => {
            if (!stats[order.merchant_code]) {
                stats[order.merchant_code] = {
                    total: 0,
                    pending: 0,
                    processing: 0,
                    shipped: 0,
                    delivered: 0
                };
            }
            stats[order.merchant_code].total++;
            stats[order.merchant_code][order.delivery_status]++;
        });
        return stats;
    }, [orders]);
    
    return (
        <div className="space-y-6">
            {/* Merchant Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(merchantStats).map(([merchant, stats]) => (
                    <div key={merchant} className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-semibold text-lg mb-2">{merchant}</h3>
                        <div className="space-y-1 text-sm">
                            <div>Total Orders: {stats.total}</div>
                            <div>Pending: {stats.pending}</div>
                            <div>Processing: {stats.processing}</div>
                            <div>Shipped: {stats.shipped}</div>
                            <div>Delivered: {stats.delivered}</div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold p-4 border-b">All Orders</h3>
                <OrdersTable orders={orders} showMerchant={true} />
            </div>
        </div>
    );
};
```

## 🔒 **Security Features**

### **Row Level Security (RLS):**
- **Users**: Can only see their own orders
- **Merchants**: Can only see and update their own orders
- **Admin**: Can see and manage all orders
- **Data isolation**: Each merchant's data is completely separated

### **Function Security:**
- All functions use `SECURITY DEFINER`
- Proper parameter validation
- Access control through RLS policies

## 📊 **Status Management**

### **Order Statuses:**
- `pending` - Order received, waiting for merchant action
- `processing` - Merchant is preparing the order
- `shipped` - Order has been shipped
- `delivered` - Order delivered successfully

### **Delivery Statuses:**
- `pending` - Initial status
- `processing` - Being prepared
- `shipped` - In transit
- `delivered` - Successfully delivered

## 🧪 **Testing the System**

### **1. Test Order Creation:**
1. Create a quotation with multiple merchant responses
2. Place order selecting different merchants
3. Verify orders appear in respective merchant dashboards
4. Check admin dashboard shows all orders

### **2. Test Merchant Management:**
1. Login as merchant
2. View orders assigned to your merchant code
3. Update delivery status
4. Verify status changes are reflected

### **3. Test Admin Access:**
1. Login as admin
2. View all orders across merchants
3. Verify complete visibility of order details
4. Check merchant statistics

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Orders not appearing in merchant dashboard:**
   - Check if `merchant_code` is set correctly
   - Verify RLS policies are working
   - Check function permissions

2. **Status updates not working:**
   - Verify merchant has correct `merchant_code`
   - Check function parameters
   - Ensure RLS policies allow updates

3. **Admin cannot see orders:**
   - Verify user has `admin` role in `user_profiles`
   - Check RLS policy for admin access
   - Ensure functions are accessible

### **Debug Queries:**
```sql
-- Check order distribution
SELECT merchant_code, COUNT(*) as order_count 
FROM orders 
GROUP BY merchant_code;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'orders';

-- Verify function permissions
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%order%';
```

## 🎉 **Benefits of This System**

1. **Complete Separation**: Each merchant sees only their orders
2. **Full Visibility**: Admin can monitor all orders across merchants
3. **Customer Details**: Merchants get complete customer information
4. **Status Management**: Easy order tracking and status updates
5. **Scalable**: Works with any number of merchants
6. **Secure**: RLS ensures data isolation
7. **Performance**: Optimized with proper indexes

## 🔮 **Future Enhancements**

1. **Email Notifications**: Automatic status update emails
2. **SMS Updates**: Delivery status SMS notifications
3. **Analytics Dashboard**: Sales and performance metrics
4. **Bulk Operations**: Mass status updates
5. **Export Features**: Order data export for merchants
6. **Mobile App**: Merchant mobile order management

---

**This system provides a robust, secure, and scalable solution for managing multi-merchant orders with complete separation and visibility as requested.**
