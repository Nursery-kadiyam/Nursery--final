# 🌟 NEW QUOTATION FLOW SYSTEM GUIDE

## 🎯 **Overview**

The new quotation flow system implements a modern marketplace approach where:

1. **Users** raise quotation requests for plants
2. **Multiple merchants** respond with their own pricing
3. **Users** can see all responses and select different merchants for different plants
4. **Admin** only monitors the process (no approval needed)

## 🔄 **New Flow Process**

### **User Side:**
1. User selects plants and raises quotation request
2. Request goes to multiple merchants automatically
3. User sees all merchant responses in "My Quotations"
4. User can select different merchants for different plants
5. User confirms selections and places order

### **Merchant Side:**
1. Merchant receives quotation request
2. Merchant sets their own prices for each plant
3. Merchant submits response with pricing and delivery details
4. User can see merchant's response

### **Admin Side:**
1. Admin monitors all quotation requests
2. Admin sees how many merchants responded to each request
3. Admin can view details of all merchant quotations
4. No approval process - admin only monitors

## 🗄️ **Database Changes**

### **New Columns Added to `quotations` table:**
```sql
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS is_user_request BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selected_merchants JSONB,
ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS order_placed_at TIMESTAMP WITH TIME ZONE;
```

### **New Functions Created:**

1. **`create_user_quotation_request`** - Creates user quotation requests
2. **`submit_merchant_quotation`** - Merchants submit their pricing
3. **`get_user_quotations_with_responses`** - Get user quotations with all merchant responses
4. **`confirm_user_merchant_selections`** - User confirms their merchant selections
5. **`mark_quotation_order_placed`** - Mark quotation as order placed

## 📱 **Frontend Updates**

### **1. Cart.tsx - Updated Quotation Request**
```typescript
// Use the new create_user_quotation_request function
const { data, error } = await supabase.rpc('create_user_quotation_request', {
  p_user_id: user.id,
  p_user_email: user.email,
  p_items: items
});
```

### **2. MyQuotations.tsx - New Merchant Response View**
- Shows user's quotation requests
- "View Responses" button to see all merchant responses
- Merchant selection interface for each plant
- Order placement with selected merchants

### **3. MerchantDashboard.tsx - Updated Submission**
```typescript
// Use the new submit_merchant_quotation function
const { data, error } = await supabase.rpc('submit_merchant_quotation', {
  p_quotation_code: q.quotation_code,
  p_merchant_code: merchantCode,
  p_unit_prices: form.unit_prices,
  p_transport_cost: transport_cost,
  p_custom_work_cost: custom_work_cost,
  p_estimated_delivery_days: estimated_delivery_days
});
```

### **4. AdminDashboard.tsx - Monitoring Only**
- Shows User → Quotation ID → No. of Merchant Responses
- View details of all merchant quotations
- No approval buttons - monitoring only

## 🚀 **Implementation Steps**

### **Step 1: Run Database Setup**
```sql
-- Run the new_quotation_flow_system.sql file in Supabase SQL Editor
```

### **Step 2: Update Frontend Files**
1. ✅ Cart.tsx - Updated to use new function
2. ✅ MyQuotations.tsx - Added merchant response view
3. ✅ MerchantDashboard.tsx - Updated submission
4. ✅ AdminDashboard.tsx - Updated for monitoring

### **Step 3: Test the Flow**

#### **Test User Flow:**
1. **Login** as a user
2. **Add plants** to cart
3. **Request quotation** - should create user request
4. **Check My Quotations** - should show request with "View Responses" button
5. **View Responses** - should show merchant responses (if any)

#### **Test Merchant Flow:**
1. **Login** as a merchant
2. **Check Available Quotes** - should show user requests
3. **Submit Quote** - should create merchant response
4. **Check My Submissions** - should show submitted quotes

#### **Test Admin Flow:**
1. **Login** as admin
2. **Check Quotations tab** - should show monitoring dashboard
3. **View Details** - should show all merchant responses

## 📊 **Data Flow Examples**

### **User Quotation Request:**
```json
{
  "id": "QT-1234567890-123",
  "quotation_code": "QC-2024-0001",
  "user_id": "user-uuid",
  "user_email": "user@example.com",
  "items": [
    {
      "product_id": "product-uuid",
      "quantity": 5,
      "name": "Rose Plant",
      "category": "flowering"
    }
  ],
  "status": "pending",
  "is_user_request": true,
  "created_at": "2024-01-01T10:00:00Z"
}
```

### **Merchant Response:**
```json
{
  "id": "MQ-1234567890-456",
  "quotation_code": "QC-2024-0001",
  "merchant_code": "MERCH001",
  "unit_prices": [25.50],
  "transport_cost": 100.00,
  "custom_work_cost": 50.00,
  "estimated_delivery_days": 7,
  "total_quote_price": 227.50,
  "status": "pending",
  "is_user_request": false,
  "created_at": "2024-01-01T11:00:00Z"
}
```

### **User Merchant Selection:**
```json
{
  "quotation_code": "QC-2024-0001",
  "selected_merchants": {
    "0": "MERCH001"  // Plant 0 selected from MERCH001
  },
  "status": "user_confirmed",
  "user_confirmed_at": "2024-01-01T12:00:00Z"
}
```

## 🔧 **Key Features**

### **1. Multiple Merchant Responses**
- Each merchant can respond to any user quotation
- Different merchants can offer different prices
- Users see all available options

### **2. Flexible Plant Selection**
- User can select different merchants for different plants
- Plant 1: Merchant A (₹25/unit)
- Plant 2: Merchant B (₹30/unit)
- Plant 3: Merchant A (₹25/unit)

### **3. Admin Monitoring**
- No approval process required
- Admin can see all quotation activity
- Monitor merchant response rates
- View detailed pricing information

### **4. Real-time Updates**
- Users see new merchant responses immediately
- Merchants see new quotation requests
- Admin dashboard updates in real-time

## 🎨 **UI/UX Improvements**

### **My Quotations Page:**
- Clean quotation request cards
- "View Responses" button for each request
- Merchant selection interface
- Order placement with selected merchants

### **Merchant Dashboard:**
- Available quotation requests
- Easy pricing input forms
- Submission confirmation
- Response tracking

### **Admin Dashboard:**
- Quotation monitoring overview
- Merchant response statistics
- Detailed quotation views
- No approval buttons

## 🔒 **Security & Permissions**

### **Database Permissions:**
```sql
GRANT EXECUTE ON FUNCTION public.create_user_quotation_request(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_merchant_quotation(TEXT, TEXT, JSONB, NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quotations_with_responses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_merchant_selections(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_quotation_order_placed(TEXT) TO authenticated;
```

### **Row Level Security:**
- Users can only see their own quotations
- Merchants can only see their own responses
- Admin can see all data for monitoring

## 📈 **Benefits of New System**

### **For Users:**
- ✅ See multiple pricing options
- ✅ Choose best prices for each plant
- ✅ No waiting for admin approval
- ✅ Transparent pricing comparison

### **For Merchants:**
- ✅ Respond to any quotation request
- ✅ Set their own competitive prices
- ✅ No admin approval required
- ✅ Direct user interaction

### **For Admin:**
- ✅ Reduced workload (no approvals)
- ✅ Better monitoring capabilities
- ✅ Market price insights
- ✅ System transparency

## 🚨 **Migration Notes**

### **Existing Data:**
- Existing quotations will continue to work
- New quotations will use the new flow
- Gradual migration recommended

### **Backward Compatibility:**
- Old quotation functions still available
- Existing orders remain unchanged
- Admin can still approve old-style quotations

## 🎯 **Next Steps**

1. **Deploy** the new system
2. **Test** all user flows
3. **Monitor** merchant adoption
4. **Gather** user feedback
5. **Optimize** based on usage patterns

---

## 📞 **Support**

If you encounter any issues with the new quotation flow system:

1. **Check** the database functions are created correctly
2. **Verify** frontend files are updated
3. **Test** each user role (user, merchant, admin)
4. **Review** console logs for errors
5. **Contact** support if issues persist

The new system provides a modern, efficient marketplace experience for all users! 🚀
