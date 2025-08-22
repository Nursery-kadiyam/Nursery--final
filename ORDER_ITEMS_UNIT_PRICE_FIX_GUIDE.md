# Order Items Unit Price Mapping Fix Guide

## Problem Description
When creating orders from quotations, the `unit_price` field in the `order_items` table was coming as NULL even though the correct unit prices were available in the `quotations.unit_prices` field. This caused issues with order tracking and reporting where the individual item unit prices were not properly stored.

## Root Cause
The issue occurred in multiple places:

1. **Frontend Order Creation**: When creating cart items from quotations in `MyQuotations.tsx`, the unit price was calculated but not passed to the cart items
2. **Order Items Insertion**: In `OrderSummaryPage.tsx` and `place-order` function, the `unit_price` field was not included when inserting order items
3. **Database Triggers**: The existing triggers were not properly handling quotation-based orders

## Solution Implemented

### 1. Database Fixes (fix_order_items_unit_price.sql)

#### A. Unit Price Extraction Function
Created a function to extract unit prices from quotations:

```sql
CREATE OR REPLACE FUNCTION extract_unit_price_from_quotation(
    p_quotation_code TEXT,
    p_item_index INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_unit_price INTEGER;
    v_unit_prices JSONB;
BEGIN
    -- Get unit_prices from quotation
    SELECT unit_prices INTO v_unit_prices
    FROM quotations 
    WHERE quotation_code = p_quotation_code;
    
    IF v_unit_prices IS NOT NULL THEN
        -- Extract unit price for the specific item index
        v_unit_price := (v_unit_prices->>p_item_index)::integer;
    ELSE
        v_unit_price := 0;
    END IF;
    
    RETURN COALESCE(v_unit_price, 0);
END;
$$;
```

#### B. Enhanced Triggers
Updated the `update_unit_price()` function to handle quotations:

```sql
CREATE OR REPLACE FUNCTION update_unit_price()
RETURNS TRIGGER AS $$
DECLARE
    v_quotation_code TEXT;
    v_unit_price INTEGER;
BEGIN
    -- Only set unit_price if it's NULL
    IF NEW.unit_price IS NULL THEN
        -- Check if this order is from a quotation
        SELECT quotation_code INTO v_quotation_code
        FROM orders 
        WHERE id = NEW.order_id;
        
        IF v_quotation_code IS NOT NULL THEN
            -- Try to get unit_price from quotation
            v_unit_price := extract_unit_price_from_quotation(v_quotation_code, 0);
            IF v_unit_price > 0 THEN
                NEW.unit_price := v_unit_price;
            ELSE
                -- Fallback: calculate from price and quantity
                NEW.unit_price := (NEW.price / NEW.quantity)::integer;
            END IF;
        ELSE
            -- For non-quotation orders, use price as unit_price
            NEW.unit_price := NEW.price::integer;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### C. Data Migration
Updated existing order items with missing unit prices:

```sql
UPDATE order_items 
SET unit_price = (
    SELECT 
        CASE 
            WHEN q.unit_prices IS NOT NULL THEN
                -- Parse unit_prices JSON and get the price for this item index
                (q.unit_prices::jsonb->>(array_position(
                    array(
                        SELECT jsonb_array_elements_text(q.unit_prices::jsonb)
                    ), 
                    oi.price::text
                ) - 1))::integer
            ELSE 
                -- Fallback: calculate unit price from total price and quantity
                (oi.price / oi.quantity)::integer
        END
    FROM orders o
    JOIN quotations q ON o.quotation_code = q.quotation_code
    WHERE o.id = order_items.order_id
    AND o.quotation_code IS NOT NULL
)
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.id = order_items.order_id 
    AND o.quotation_code IS NOT NULL
)
AND unit_price IS NULL;
```

### 2. Frontend Fixes

#### A. MyQuotations.tsx - Enhanced Cart Item Creation
Updated the `placeOrder` function to include unit_price:

```typescript
return {
    id: product.id,
    name: product.name,
    price: itemPrice, // Individual item total price
    unit_price: pricePerUnit, // Unit price from quotation
    image: product.image_url,
    quantity: item.quantity,
    category: product.category || 'other',
    quotation_id: quotation.id,
    quotation_code: quotation.quotation_code,
    transport_cost: quotation.transport_cost || 0,
    custom_work_cost: quotation.custom_work_cost || 0
};
```

#### B. OrderSummaryPage.tsx - Enhanced Order Items Creation
Updated order items insertion to include unit_price:

```typescript
const orderItems = cartProducts.map(item => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
    unit_price: item.unit_price || Math.round(item.price / item.quantity)
}));
```

#### C. place-order Function - Enhanced Order Items Creation
Updated the Supabase Edge Function to include unit_price:

```typescript
const orderItemsToInsert = items.map((item: any) => ({
    order_id: newOrder.id,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
    unit_price: item.unit_price || Math.round(item.price / item.quantity)
}));
```

## Implementation Steps

### Step 1: Run the Database Script
Execute `fix_order_items_unit_price.sql` in your Supabase SQL Editor:

```sql
-- This will:
-- 1. Check current data issues
-- 2. Update existing order items with unit prices from quotations
-- 3. Create unit price extraction function
-- 4. Update triggers to auto-set unit prices
-- 5. Verify the fixes
```

### Step 2: Update Frontend Code
The following files have been updated:
- `src/pages/MyQuotations.tsx`: Enhanced cart item creation with unit_price
- `src/pages/OrderSummaryPage.tsx`: Enhanced order items creation with unit_price
- `supabase/functions/place-order/index.ts`: Enhanced order items creation with unit_price

### Step 3: Test the Implementation
1. Create a quotation with unit prices
2. Approve the quotation
3. Place an order from the quotation
4. Verify that order_items.unit_price is properly set

## Expected Results

### Before Fix:
- `order_items.unit_price` was NULL for quotation-based orders
- Unit prices were only available in `quotations.unit_prices`
- No proper mapping between quotation unit prices and order items

### After Fix:
- `order_items.unit_price` is properly set from `quotations.unit_prices`
- Automatic unit price extraction for quotation-based orders
- Fallback calculation for non-quotation orders
- Triggers ensure future orders will have proper unit prices

## Benefits

1. **Data Integrity**: Unit prices are now properly stored in order_items table
2. **Order Tracking**: Better tracking of individual item prices in orders
3. **Reporting**: Accurate reporting on unit prices and order values
4. **Automation**: Triggers automatically handle unit price mapping
5. **Backward Compatibility**: Existing orders are updated with proper unit prices

## Data Flow

### Quotation Creation:
1. Merchant sets unit prices in `quotations.unit_prices` (JSONB array)
2. Quotation is approved with specific unit prices

### Order Creation from Quotation:
1. User places order from approved quotation
2. Frontend extracts unit prices from `quotation.unit_prices`
3. Cart items include both total price and unit price
4. Order items are created with proper unit_price values
5. Database triggers provide additional validation

### Order Creation (Non-Quotation):
1. User places regular order
2. Unit price is calculated as `price / quantity`
3. Order items are created with calculated unit price

## Verification

### Database Verification:
```sql
-- Check orders with proper unit prices
SELECT 
    o.order_code,
    o.quotation_code,
    oi.product_id,
    oi.quantity,
    oi.price,
    oi.unit_price,
    CASE 
        WHEN oi.unit_price IS NOT NULL THEN '✅ Fixed'
        ELSE '❌ Still Missing'
    END as status
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.quotation_code IS NOT NULL
ORDER BY o.created_at DESC;
```

### Frontend Verification:
1. Check browser console for unit price values in cart items
2. Verify order items include unit_price when creating orders
3. Test both quotation-based and regular orders

## Troubleshooting

### Common Issues:

1. **Unit Price Still NULL**: Check if quotation has proper unit_prices data
2. **Wrong Unit Price**: Verify quotation.unit_prices array matches item order
3. **Trigger Not Working**: Ensure triggers are properly created and enabled
4. **Frontend Errors**: Check if unit_price is being passed correctly

### Debug Steps:
1. Check quotation.unit_prices data structure
2. Verify order_items insertion includes unit_price
3. Test the extract_unit_price_from_quotation function
4. Check trigger execution logs

## Files Modified

1. **`fix_order_items_unit_price.sql`**: Database fixes and triggers
2. **`src/pages/MyQuotations.tsx`**: Enhanced cart item creation
3. **`src/pages/OrderSummaryPage.tsx`**: Enhanced order items creation
4. **`supabase/functions/place-order/index.ts`**: Enhanced order items creation
5. **`ORDER_ITEMS_UNIT_PRICE_FIX_GUIDE.md`**: This documentation

## Verification Checklist

- [ ] Database script executed successfully
- [ ] Existing order items updated with unit prices
- [ ] Triggers created and working
- [ ] Frontend code updated with unit_price handling
- [ ] Quotation-based orders show proper unit prices
- [ ] Regular orders calculate unit prices correctly
- [ ] No console errors related to unit price
- [ ] Order items display correct unit prices in admin dashboard

This fix ensures that unit prices from quotations are properly mapped to order items, providing accurate order tracking and reporting capabilities.
