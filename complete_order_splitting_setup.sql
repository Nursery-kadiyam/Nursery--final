-- Complete Order Splitting System Setup
-- This script sets up the entire parent-child order splitting system

-- 1. Add required columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS merchant_id UUID,
ADD COLUMN IF NOT EXISTS order_code TEXT;

-- 2. Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nursery_name TEXT NOT NULL,
    merchant_code TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    email TEXT,
    nursery_address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add merchant_code to order_items if not exists
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS merchant_code TEXT;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_code ON orders(merchant_code);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_code ON merchants(merchant_code);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant_code ON order_items(merchant_code);

-- 5. Enable RLS for merchants
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for merchants
DROP POLICY IF EXISTS "Merchants can view own data" ON merchants;
CREATE POLICY "Merchants can view own data" ON merchants
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view merchant basic info" ON merchants;
CREATE POLICY "Public can view merchant basic info" ON merchants
    FOR SELECT USING (status = 'active');

-- 7. Grant permissions
GRANT ALL ON merchants TO authenticated;
GRANT SELECT ON merchants TO anon;

-- 8. Create function to update updated_at for merchants
CREATE OR REPLACE FUNCTION update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create trigger for merchants updated_at
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_merchants_updated_at();

-- 10. Create order splitting function
CREATE OR REPLACE FUNCTION place_order_with_splitting(
    p_user_id uuid,
    p_delivery_address jsonb,
    p_cart_items jsonb,
    p_total_amount numeric,
    p_quotation_code text DEFAULT NULL,
    p_razorpay_payment_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_order_id uuid;
    v_child_order_id uuid;
    v_result jsonb;
    v_cart_item jsonb;
    v_item_id uuid;
    v_quantity integer;
    v_price numeric;
    v_unit_price numeric;
    v_merchant_code text;
    v_merchant_groups jsonb := '{}';
    v_merchant_group jsonb;
    v_merchant_total numeric;
    v_order_code text;
    v_parent_order_code text;
BEGIN
    -- Generate order codes
    v_parent_order_code := 'ORD-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    
    -- Group cart items by merchant
    FOR v_cart_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_merchant_code := COALESCE(v_cart_item->>'merchant_code', v_cart_item->>'selected_merchant', 'admin');
        
        -- Initialize merchant group if not exists
        IF NOT (v_merchant_groups ? v_merchant_code) THEN
            v_merchant_groups := v_merchant_groups || jsonb_build_object(v_merchant_code, jsonb_build_array());
        END IF;
        
        -- Add item to merchant group
        v_merchant_groups := jsonb_set(
            v_merchant_groups, 
            ARRAY[v_merchant_code], 
            (v_merchant_groups->v_merchant_code) || v_cart_item
        );
    END LOOP;
    
    -- Create parent order
    INSERT INTO orders (
        user_id,
        delivery_address,
        cart_items,
        total_amount,
        quotation_code,
        parent_order_id,
        merchant_code,
        order_code,
        status,
        razorpay_payment_id,
        payment_status
    ) VALUES (
        p_user_id,
        p_delivery_address,
        p_cart_items,
        p_total_amount,
        p_quotation_code,
        NULL, -- This is the parent order
        'multiple', -- Indicates multiple merchants
        v_parent_order_code,
        'pending',
        p_razorpay_payment_id,
        CASE WHEN p_razorpay_payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END
    ) RETURNING id INTO v_parent_order_id;
    
    -- Create child orders for each merchant
    FOR v_merchant_code, v_merchant_group IN SELECT * FROM jsonb_each(v_merchant_groups)
    LOOP
        -- Calculate merchant total
        v_merchant_total := 0;
        FOR v_cart_item IN SELECT * FROM jsonb_array_elements(v_merchant_group)
        LOOP
            v_merchant_total := v_merchant_total + COALESCE((v_cart_item->>'price')::numeric, 0);
        END LOOP;
        
        -- Generate child order code
        v_order_code := 'ORD-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
        
        -- Get merchant_id if merchant_code is not 'admin'
        DECLARE
            v_merchant_id uuid := NULL;
        BEGIN
            IF v_merchant_code != 'admin' THEN
                SELECT id INTO v_merchant_id FROM merchants WHERE merchant_code = v_merchant_code LIMIT 1;
            END IF;
        END;
        
        -- Create child order
        INSERT INTO orders (
            user_id,
            delivery_address,
            cart_items,
            total_amount,
            quotation_code,
            parent_order_id,
            merchant_code,
            merchant_id,
            order_code,
            status,
            razorpay_payment_id,
            payment_status
        ) VALUES (
            p_user_id,
            p_delivery_address,
            v_merchant_group,
            v_merchant_total,
            p_quotation_code,
            v_parent_order_id, -- Link to parent
            v_merchant_code,
            v_merchant_id,
            v_order_code,
            'pending',
            p_razorpay_payment_id,
            CASE WHEN p_razorpay_payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END
        ) RETURNING id INTO v_child_order_id;
        
        -- Insert order items for this merchant
        FOR v_cart_item IN SELECT * FROM jsonb_array_elements(v_merchant_group)
        LOOP
            v_item_id := (v_cart_item->>'id')::uuid;
            v_quantity := (v_cart_item->>'quantity')::integer;
            v_price := (v_cart_item->>'price')::numeric;
            v_unit_price := (v_cart_item->>'unit_price')::numeric;
            
            -- Insert order item
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                price,
                unit_price,
                subtotal,
                merchant_code
            ) VALUES (
                v_child_order_id,
                v_item_id,
                v_quantity,
                v_price,
                COALESCE(v_unit_price, v_price / v_quantity),
                v_quantity * COALESCE(v_unit_price, v_price / v_quantity),
                v_merchant_code
            );
        END LOOP;
    END LOOP;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'parent_order_id', v_parent_order_id,
        'parent_order_code', v_parent_order_code,
        'message', 'Order placed successfully with merchant splitting'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to place order with splitting'
        );
        RETURN v_result;
END;
$$;

-- 11. Create function to get merchant details for orders
CREATE OR REPLACE FUNCTION get_merchant_details_for_orders(merchant_codes text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '{}';
    v_merchant_code text;
    v_merchant_data record;
BEGIN
    FOREACH v_merchant_code IN ARRAY merchant_codes
    LOOP
        SELECT nursery_name, merchant_code, phone_number, email
        INTO v_merchant_data
        FROM merchants 
        WHERE merchant_code = v_merchant_code;
        
        IF FOUND THEN
            v_result := v_result || jsonb_build_object(
                v_merchant_code,
                jsonb_build_object(
                    'name', v_merchant_data.nursery_name,
                    'merchant_code', v_merchant_data.merchant_code,
                    'phone', v_merchant_data.phone_number,
                    'email', v_merchant_data.email
                )
            );
        ELSE
            v_result := v_result || jsonb_build_object(
                v_merchant_code,
                jsonb_build_object(
                    'name', 'Merchant ' || v_merchant_code,
                    'merchant_code', v_merchant_code,
                    'phone', 'N/A',
                    'email', 'N/A'
                )
            );
        END IF;
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION place_order_with_splitting TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_details_for_orders TO authenticated;

-- 13. Create sample merchant data (optional)
INSERT INTO merchants (user_id, nursery_name, merchant_code, phone_number, email, nursery_address, status)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Kadiyam Nursery', 'admin', '9876543210', 'admin@kadiyam.com', 'Kadiyam, Andhra Pradesh', 'active')
ON CONFLICT (merchant_code) DO NOTHING;

-- 14. Update existing products to have merchant_code
UPDATE products 
SET merchant_code = 'admin' 
WHERE merchant_code IS NULL;

-- 15. Verify setup
SELECT 
    'Setup Complete' as status,
    (SELECT COUNT(*) FROM merchants) as merchant_count,
    (SELECT COUNT(*) FROM orders WHERE parent_order_id IS NULL) as parent_orders,
    (SELECT COUNT(*) FROM orders WHERE parent_order_id IS NOT NULL) as child_orders;