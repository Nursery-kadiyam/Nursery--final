# Order Split Management Implementation Guide

## Overview
This guide covers the implementation of a comprehensive order splitting system that allows users to place orders with multiple merchants and automatically splits them into separate merchant-specific orders.

## 🏗️ Architecture

### Database Structure
- **Parent Orders**: Main order record with `parent_order_id = NULL`
- **Child Orders**: Merchant-specific orders with `parent_order_id = parent_order.id`
- **Order Items**: Linked to child orders, not parent orders

### Key Tables
```sql
orders (
  id UUID PRIMARY KEY,
  user_id UUID,
  parent_order_id UUID NULL, -- NULL for parent orders
  merchant_id UUID NULL, -- NULL for parent orders
  merchant_code TEXT,
  quotation_code TEXT,
  total_amount NUMERIC,
  cart_items JSONB,
  status TEXT,
  created_at TIMESTAMP
)

order_items (
  id UUID PRIMARY KEY,
  order_id UUID, -- References child order, not parent
  product_id UUID,
  quantity INTEGER,
  price NUMERIC,
  unit_price NUMERIC
)
```

## 🎯 Implementation Components

### 1. Order Split Summary Page (`OrderSplitSummary.tsx`)
**Purpose**: Shows users how their order will be split across merchants before confirmation.

**Features**:
- ✅ Displays order split overview (merchants, items, total)
- ✅ Expandable merchant cards with details
- ✅ Shows merchant information and contact details
- ✅ Displays expected delivery timeline
- ✅ Order summary with breakdown by merchant

**Usage**:
```tsx
<OrderSplitSummary
  cartItems={cartItems}
  quotationCode={quotationCode}
  onConfirmOrder={handleConfirmOrderSplit}
  onCancel={handleCancel}
/>
```

### 2. Enhanced Orders Page (`EnhancedOrders.tsx`)
**Purpose**: Shows users their orders with split details.

**Features**:
- ✅ Shows only parent orders in main list
- ✅ Expandable view to see merchant splits
- ✅ Order details with merchant breakdown
- ✅ Status tracking for each merchant order

**Key Functions**:
- Groups child orders by parent order
- Shows merchant-specific order details
- Displays order split visualization

### 3. Enhanced Merchant Dashboard (`EnhancedMerchantDashboard.tsx`)
**Purpose**: Shows merchants only their assigned orders.

**Features**:
- ✅ Shows only child orders for the merchant
- ✅ Order status management (pending → confirmed → processing → shipped → delivered)
- ✅ Order details and item management
- ✅ Revenue tracking and statistics

**Key Functions**:
- Filters orders by merchant_id
- Provides status update actions
- Shows order statistics and revenue

## 🔄 Order Flow

### 1. User Selection Flow
```
User Quotations Page
    ↓
Select Plants from Merchants
    ↓
Order Confirmation Dialog
    ↓
Order Split Summary Page ← NEW
    ↓
Confirm Order Split
    ↓
Create Parent + Child Orders
    ↓
Navigate to Order Summary
```

### 2. Order Creation Process
```typescript
// 1. Group items by merchant
const merchantGroups = groupItemsByMerchant(cartItems);

// 2. Create parent order
const parentOrder = await createParentOrder({
  user_id: user.id,
  quotation_code: quotationCode,
  total_amount: calculateTotal(merchantGroups),
  cart_items: allItems
});

// 3. Create child orders for each merchant
for (const [merchantCode, items] of Object.entries(merchantGroups)) {
  const childOrder = await createChildOrder({
    parent_order_id: parentOrder.id,
    merchant_id: merchantId,
    merchant_code: merchantCode,
    total_amount: calculateMerchantTotal(items),
    cart_items: items
  });
  
  // 4. Create order items for this merchant
  await createOrderItems(childOrder.id, items);
}
```

## 🎨 UI Components

### Order Split Summary Features
- **Merchant Cards**: Expandable cards showing merchant details
- **Order Overview**: Statistics (merchants, items, total)
- **Timeline**: Expected delivery timeline for each merchant
- **Action Buttons**: Confirm or cancel order split

### Enhanced Orders Features
- **Parent Order List**: Main order view with expandable details
- **Merchant Split View**: Shows how order is split across merchants
- **Order Details**: Complete order information with items

### Merchant Dashboard Features
- **Order Management**: Status updates and order actions
- **Statistics**: Revenue and order count tracking
- **Order Details**: Item management and customer information

## 🔧 Integration Steps

### 1. Update MyQuotations.tsx
```typescript
// Add import
import OrderSplitSummary from './OrderSplitSummary';

// Add state
const [showOrderSplitSummary, setShowOrderSplitSummary] = useState(false);
const [cartItemsForOrder, setCartItemsForOrder] = useState<any[]>([]);

// Modify order confirmation
const handleOrderConfirmation = async () => {
  // Create cart items for split summary
  const cartItems = createCartItemsFromSelectedPlants();
  setCartItemsForOrder(cartItems);
  setShowOrderSplitSummary(true);
};

// Add split summary component
{showOrderSplitSummary && (
  <OrderSplitSummary
    cartItems={cartItemsForOrder}
    quotationCode={selectedQuotation?.quotation_code}
    onConfirmOrder={handleConfirmOrderSplit}
    onCancel={() => setShowOrderSplitSummary(false)}
  />
)}
```

### 2. Update Routing
```typescript
// Add new routes
<Route path="/orders" element={<EnhancedOrders />} />
<Route path="/merchant-dashboard" element={<EnhancedMerchantDashboard />} />
```

### 3. Update Navigation
```typescript
// Update navbar links
<Link to="/orders">My Orders</Link>
<Link to="/merchant-dashboard">Merchant Dashboard</Link>
```

## 🚀 Benefits

### For Users
- ✅ **Clear Order Split Visualization**: See exactly how orders are split
- ✅ **Merchant Information**: Know which merchant handles which items
- ✅ **Delivery Tracking**: Track delivery from each merchant
- ✅ **Unified Order View**: Single order with merchant breakdown

### For Merchants
- ✅ **Focused Dashboard**: Only see their assigned orders
- ✅ **Order Management**: Update status and manage deliveries
- ✅ **Revenue Tracking**: See their portion of orders
- ✅ **Customer Information**: Access to customer details

### For System
- ✅ **Scalable Architecture**: Easy to add more merchants
- ✅ **Data Integrity**: Proper parent-child relationships
- ✅ **Order Tracking**: Complete audit trail
- ✅ **Flexible Pricing**: Each merchant can have different pricing

## 🔍 Testing

### Test Scenarios
1. **Single Merchant Order**: User selects items from one merchant
2. **Multi-Merchant Order**: User selects items from multiple merchants
3. **Order Split Display**: Verify split summary shows correctly
4. **Merchant Dashboard**: Verify merchants see only their orders
5. **Status Updates**: Test order status flow
6. **Order Details**: Verify all order information displays correctly

### Test Data
```typescript
// Sample test order
const testOrder = {
  parentOrder: {
    id: "parent-123",
    order_code: "ORD-2025-0001",
    total_amount: 1500,
    merchant_code: "parent"
  },
  childOrders: [
    {
      id: "child-1",
      parent_order_id: "parent-123",
      merchant_code: "MC-2025-0001",
      total_amount: 800
    },
    {
      id: "child-2", 
      parent_order_id: "parent-123",
      merchant_code: "MC-2025-0002",
      total_amount: 700
    }
  ]
};
```

## 📋 Implementation Checklist

- [x] Create OrderSplitSummary component
- [x] Create EnhancedOrders component  
- [x] Create EnhancedMerchantDashboard component
- [x] Update MyQuotations.tsx integration
- [x] Add order split flow
- [x] Implement merchant grouping logic
- [x] Add order status management
- [x] Create comprehensive documentation

## 🎯 Next Steps

1. **Test the Implementation**: Run through all test scenarios
2. **Update Navigation**: Add new routes to your routing system
3. **Style Refinements**: Customize styling to match your design
4. **Error Handling**: Add comprehensive error handling
5. **Performance Optimization**: Optimize queries and rendering
6. **User Testing**: Get feedback from users and merchants

## 🔧 Customization

### Styling
- Update color schemes in status badges
- Customize card layouts and spacing
- Add your brand colors and fonts

### Functionality
- Add more order status options
- Implement order cancellation
- Add order modification capabilities
- Implement notification system

### Integration
- Connect with payment systems
- Add email notifications
- Integrate with shipping providers
- Add analytics and reporting

This implementation provides a complete order splitting system that scales with your business needs while providing excellent user experience for both customers and merchants.