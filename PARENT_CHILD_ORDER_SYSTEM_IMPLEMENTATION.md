# Parent-Child Order System Implementation

## Overview
This implementation refactors the order system to support parent-child split orders, allowing multiple merchants to fulfill different parts of a single customer order.

## Database Schema Updates

### New Columns Added

#### Orders Table
- `parent_order_id` (UUID, REFERENCES orders(id), DEFAULT NULL) - References parent order for child orders
- `merchant_id` (UUID, REFERENCES merchants(id), DEFAULT NULL) - Merchant ID for child orders
- `subtotal` (NUMERIC, DEFAULT 0) - Subtotal for this order

#### Order Items Table
- `subtotal` (NUMERIC, DEFAULT 0) - Subtotal for this order item

#### Indexes Created
- `idx_orders_parent` - Index on parent_order_id
- `idx_orders_merchant` - Index on merchant_id
- `idx_order_items_subtotal` - Index on subtotal

## Implementation Details

### 1. Order Creation (OrderSummaryPage.tsx)

**Key Changes:**
- Groups cart items by merchant before order creation
- Creates one parent order with `parent_order_id = null`
- Creates child orders for each merchant group with `parent_order_id = parent.id`
- Each child order has `merchant_id` set to the specific merchant
- Calculates subtotals for each merchant's portion

**Flow:**
1. Group cart items by `selected_merchant` or `merchant_code`
2. Create parent order with total amount
3. For each merchant group:
   - Get merchant_id from merchant_code
   - Calculate merchant subtotal
   - Create child order with parent_order_id reference
   - Insert order_items with subtotal calculations

### 2. Order Display (Orders.tsx)

**Key Changes:**
- Queries only parent orders (`parent_order_id IS NULL`)
- Fetches child orders with merchant details
- Shows expandable child orders under each parent
- Displays merchant-wise subtotals and status

**UI Features:**
- Parent order shows total amount
- Child orders are expandable with merchant names
- Each child order shows its subtotal and status
- Merchant count badge on parent orders

### 3. Merchant Dashboard (MerchantDashboard.tsx)

**Key Changes:**
- Queries only child orders for the specific merchant
- Shows parent order context (order_code)
- Displays merchant-specific items and subtotals
- Independent order status management per merchant

**UI Features:**
- Parent Order column shows the original order code
- Subtotal column shows merchant's portion
- Customer info from parent order
- Merchant can manage only their portion

### 4. Quotation Flow (MyQuotations.tsx)

**Existing Features (Already Implemented):**
- 3-column design for merchant selection
- Group by merchant functionality
- "Accept Full Response" and "Select Line Items" options
- Merchant-wise order creation

## Database Migration

Run the following SQL to apply the schema changes:

```sql
-- Add parent-child columns to orders table
ALTER TABLE public.orders 
ADD COLUMN parent_order_id UUID REFERENCES public.orders(id) DEFAULT NULL,
ADD COLUMN merchant_id UUID REFERENCES public.merchants(id) DEFAULT NULL,
ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Add subtotal column to order_items table
ALTER TABLE public.order_items 
ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_subtotal ON public.order_items(subtotal);

-- Update existing orders to maintain backward compatibility
UPDATE public.orders 
SET merchant_id = m.id
FROM public.merchants m 
WHERE orders.merchant_code = m.merchant_code;

-- Calculate subtotals for existing order_items
UPDATE public.order_items 
SET subtotal = (quantity * COALESCE(unit_price, price));

-- Update existing orders subtotal to sum of their order_items
UPDATE public.orders 
SET subtotal = COALESCE(
    (SELECT SUM(oi.subtotal) 
     FROM public.order_items oi 
     WHERE oi.order_id = orders.id), 
    0
);
```

## Key Benefits

1. **Multi-Merchant Support**: Single customer order can be fulfilled by multiple merchants
2. **Independent Management**: Each merchant manages only their portion
3. **Clear Tracking**: Parent order provides overall context, child orders show merchant details
4. **Backward Compatibility**: Existing orders continue to work
5. **Scalable**: Easy to add more merchants or modify order structure

## Testing Scenarios

1. **Multi-Merchant Selection**: Select items from different merchants in quotations
2. **Order Creation**: Verify parent and child orders are created correctly
3. **Order Display**: Check parent orders show expandable child orders
4. **Merchant Dashboard**: Verify merchants see only their child orders
5. **Subtotal Calculations**: Ensure parent total equals sum of child subtotals

## Future Enhancements

1. **Order Status Synchronization**: Update parent order status based on child order statuses
2. **Merchant Notifications**: Notify merchants when their portion is ready
3. **Shipping Coordination**: Coordinate delivery from multiple merchants
4. **Payment Splitting**: Handle payments to different merchants
5. **Analytics**: Track performance across merchants

## Files Modified

- `src/pages/OrderSummaryPage.tsx` - Order creation logic
- `src/pages/Orders.tsx` - Parent order display with child orders
- `src/pages/MerchantDashboard.tsx` - Merchant-specific child order display
- `parent_child_order_schema_update.sql` - Database schema updates

The implementation maintains backward compatibility while adding powerful multi-merchant order management capabilities.