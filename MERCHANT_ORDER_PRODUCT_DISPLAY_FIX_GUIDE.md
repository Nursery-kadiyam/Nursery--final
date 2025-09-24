# 🛠️ Merchant Order Product Display Fix Guide

## Problem
Orders are appearing in the merchant dashboard but product names and images are not being fetched/displayed correctly.

## Root Cause Analysis
1. **Missing Database Functions**: The `get_merchant_orders_with_products` function may not exist
2. **Incorrect Data Structure**: Order items are stored in `cart_items` (JSONB) but the code is looking for `order_items` table
3. **Product Linking Issues**: Products are not properly linked to order items
4. **Image Path Issues**: Product images may have incorrect paths or missing fallbacks

## Solution

### Step 1: Create Database Functions

Run the SQL script to create the necessary functions:

```sql
-- Create the merchant orders function with product details
CREATE OR REPLACE FUNCTION get_merchant_orders_with_products(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    merchant_code TEXT,
    buyer_reference TEXT,
    order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.total_amount,
        o.created_at,
        o.status,
        o.merchant_code,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', COALESCE(p.name, 'Unknown Product'),
                        'product_image', COALESCE(p.image_url, '/assets/placeholder.svg'),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'unit_price', oi.unit_price,
                        'subtotal', oi.price * oi.quantity,
                        'quotation_id', oi.quotation_id,
                        'merchant_code', o.merchant_code
                    )
                )
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        ) as order_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Create a simpler function that uses cart_items
CREATE OR REPLACE FUNCTION get_merchant_orders_simple(p_merchant_code TEXT)
RETURNS TABLE (
    order_id UUID,
    order_code TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    merchant_code TEXT,
    buyer_reference TEXT,
    cart_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_code,
        o.total_amount,
        o.created_at,
        o.status,
        o.merchant_code,
        'Buyer #' || SUBSTRING(o.id::text, 1, 4) as buyer_reference,
        COALESCE(o.cart_items, '[]'::jsonb) as cart_items
    FROM orders o
    WHERE o.merchant_code = p_merchant_code
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_merchant_orders_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_orders_simple TO authenticated;
```

### Step 2: Update Merchant Dashboard Component

The merchant dashboard has been updated to:

1. **Use the simpler function first**: `get_merchant_orders_simple` which uses `cart_items`
2. **Fallback to direct query**: If the function fails, use direct database query
3. **Process both order_items and cart_items**: Handle both data structures
4. **Proper image fallbacks**: Use placeholder images when product images are missing

### Step 3: Key Changes Made

#### In `src/pages/MerchantDashboard.tsx`:

1. **Function Call Update**:
```typescript
const { data: functionOrders, error: functionError } = await supabase
    .rpc('get_merchant_orders_simple', {
        p_merchant_code: merchantCode
    });
```

2. **Enhanced Item Processing**:
```typescript
// First try to get items from order_items (if available)
if (order.order_items && Array.isArray(order.order_items)) {
    items = order.order_items.map((item: any, index: number) => {
        const processedItem = {
            id: item.id || `item-${index}`,
            name: item.product_name || item.name || 'Unknown Product',
            product_name: item.product_name || item.name || 'Unknown Product',
            quantity: item.quantity || 1,
            price: item.subtotal || item.price || 0,
            unit_price: item.unit_price || 0,
            subtotal: item.subtotal || (item.price * item.quantity) || 0,
            image: item.product_image || item.image || item.image_url || '/assets/placeholder.svg',
            image_url: item.product_image || item.image || item.image_url || '/assets/placeholder.svg',
            product_id: item.product_id,
            quotation_id: item.quotation_id,
            merchant_code: merchantCode
        };
        return processedItem;
    });
}
// Fallback to cart_items if order_items is not available
else if (order.cart_items && Array.isArray(order.cart_items)) {
    items = order.cart_items.map((item: any, index: number) => {
        const processedItem = {
            id: item.id || `item-${index}`,
            name: item.name || item.product_name || 'Unknown Product',
            product_name: item.name || item.product_name || 'Unknown Product',
            quantity: item.quantity || 1,
            price: item.price || 0,
            unit_price: item.unit_price || (item.price / item.quantity) || 0,
            subtotal: item.price || 0,
            image: item.image || item.image_url || '/assets/placeholder.svg',
            image_url: item.image || item.image_url || '/assets/placeholder.svg',
            product_id: item.id,
            quotation_id: item.quotation_id,
            merchant_code: merchantCode
        };
        return processedItem;
    });
}
```

### Step 4: Testing

Use the test file `test_merchant_order_product_display.html` to verify:

1. **Function Availability**: Check if both functions exist and work
2. **Data Structure**: Verify the data structure returned by functions
3. **Product Display**: Ensure product names and images are displayed correctly
4. **Fallback Handling**: Test fallback scenarios

### Step 5: Expected Results

After applying the fix:

✅ **Orders appear in merchant dashboard**
✅ **Product names are displayed correctly**
✅ **Product images are shown with proper fallbacks**
✅ **Order details are complete**
✅ **Both new and existing orders work**

### Step 6: Troubleshooting

If issues persist:

1. **Check Database Functions**: Ensure functions are created successfully
2. **Verify Data Structure**: Check if `cart_items` contains proper product data
3. **Image Paths**: Ensure product images have correct paths
4. **Console Logs**: Check browser console for detailed error messages
5. **Database Permissions**: Ensure RLS policies allow merchant access

### Step 7: Files Modified

- `src/pages/MerchantDashboard.tsx` - Updated order processing logic
- `fix_merchant_order_product_display.sql` - Database functions
- `test_merchant_order_product_display.html` - Test file
- `MERCHANT_ORDER_PRODUCT_DISPLAY_FIX_GUIDE.md` - This guide

## Summary

The fix addresses the core issue of product names and images not displaying in the merchant dashboard by:

1. Creating proper database functions to fetch order data
2. Updating the frontend to handle both `order_items` and `cart_items` data structures
3. Implementing proper fallbacks for missing product data
4. Ensuring image paths are handled correctly

This ensures that merchants can see complete order details including product names and images in their dashboard.