# 🔄 Order Splitting Implementation Guide

## Overview
This guide implements a complete parent-child order splitting system where:
- **Users** see a combined view of their orders with merchant breakdown
- **Merchants** see only their child orders with customer details
- **Admin** sees all orders across all merchants
- **Privacy** is maintained - merchants only see necessary customer info

## Database Changes

### 1. Run the Setup Script
Execute `complete_order_splitting_setup.sql` in your Supabase SQL Editor to:
- Add parent_order_id and merchant_id columns to orders table
- Create merchants table with proper RLS policies
- Add merchant_code to order_items table
- Create order splitting function
- Set up indexes and permissions

### 2. Key Database Structure
```sql
-- Parent Orders (user's main order)
orders (
    id UUID PRIMARY KEY,
    user_id UUID,
    parent_order_id NULL, -- Parent orders have NULL
    merchant_code 'multiple', -- Indicates multiple merchants
    total_amount DECIMAL, -- Sum of all child orders
    status TEXT, -- Overall status
    ...
)

-- Child Orders (merchant-specific)
orders (
    id UUID PRIMARY KEY,
    user_id UUID,
    parent_order_id UUID, -- References parent order
    merchant_code TEXT, -- Specific merchant
    merchant_id UUID, -- References merchants table
    total_amount DECIMAL, -- This merchant's subtotal
    status TEXT, -- Individual merchant status
    ...
)

-- Merchants Table
merchants (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    nursery_name TEXT,
    merchant_code TEXT UNIQUE,
    phone_number TEXT,
    email TEXT,
    nursery_address TEXT,
    status TEXT DEFAULT 'active'
)
```

## Code Changes Made

### 1. OrderSummaryPage.tsx
- Updated to use `place_order_with_splitting` function
- Removed manual parent-child order creation
- Simplified order placement process

### 2. Orders.tsx (User View)
- Added `fetchChildOrders` function to get merchant-specific orders
- Updated order display to show merchant breakdown
- Added merchant details fetching
- Enhanced order details dialog with merchant grouping

### 3. MerchantDashboard.tsx
- Updated to show only child orders for the merchant
- Added user profile data fetching for customer info
- Enhanced order management with proper filtering

## User Experience Flows

### User Order Summary Page
1. **Order List**: Shows parent orders only
2. **Order Details**: Click to see merchant breakdown
3. **Merchant View**: Each merchant shows their items and status
4. **Privacy**: Only shows merchant nursery names, not contact details

### Merchant Dashboard Orders Page
1. **Orders List**: Shows only child orders for that merchant
2. **Customer Info**: Shows customer name and phone (from user_profiles)
3. **Order Items**: Shows products, quantities, and pricing
4. **Status Management**: Update order status (pending → confirmed → shipped → delivered)

### Admin View
1. **Complete Access**: Can see all parent and child orders
2. **Merchant Management**: Full access to merchant details
3. **Order Monitoring**: Track orders across all merchants

## Privacy Implementation

### Data Access Rules
- **Users**: Can see merchant nursery names and order status
- **Merchants**: Can see customer name, phone, and delivery address
- **Admin**: Full access to all data

### RLS Policies
```sql
-- Merchants can only see their own data
CREATE POLICY "Merchants can view own data" ON merchants
    FOR ALL USING (auth.uid() = user_id);

-- Public can see basic merchant info
CREATE POLICY "Public can view merchant basic info" ON merchants
    FOR SELECT USING (status = 'active');
```

## Order Status Flow

### Parent Order Status
- **Pending**: Any child order is pending
- **Confirmed**: All child orders confirmed
- **Shipped**: All child orders shipped
- **Delivered**: All child orders delivered
- **Cancelled**: Any child order cancelled

### Child Order Status
- **Pending**: Awaiting merchant confirmation
- **Confirmed**: Merchant accepted order
- **Shipped**: Items dispatched
- **Delivered**: Items delivered to customer
- **Cancelled**: Order cancelled

## Testing the Implementation

### 1. Test Order Placement
1. Add items from different merchants to cart
2. Place order through OrderSummaryPage
3. Verify parent order is created
4. Verify child orders are created for each merchant
5. Verify order_items are properly linked

### 2. Test User Order View
1. Go to Orders page
2. Verify only parent orders are shown
3. Click on order details
4. Verify merchant breakdown is displayed
5. Verify merchant names are shown (not contact details)

### 3. Test Merchant Dashboard
1. Login as merchant
2. Go to merchant dashboard
3. Verify only child orders for that merchant are shown
4. Verify customer details are visible
5. Test order status updates

### 4. Test Admin View
1. Login as admin
2. Verify access to all orders
3. Verify access to all merchant details
4. Test order management across merchants

## Key Functions

### place_order_with_splitting()
- Groups cart items by merchant
- Creates parent order
- Creates child orders for each merchant
- Inserts order items for each child order
- Returns success/error status

### get_merchant_details_for_orders()
- Fetches merchant details for order display
- Returns merchant names and basic info
- Handles missing merchant data gracefully

## Security Considerations

1. **RLS Policies**: Properly configured for data isolation
2. **Function Security**: Uses SECURITY DEFINER for controlled access
3. **Data Validation**: Input validation in all functions
4. **Error Handling**: Comprehensive error handling and logging

## Performance Optimizations

1. **Indexes**: Created on frequently queried columns
2. **Batch Operations**: Order creation in single transaction
3. **Efficient Queries**: Optimized joins and selects
4. **Caching**: Merchant details cached for order display

This implementation provides a complete order splitting system with proper privacy controls and user experience optimization.