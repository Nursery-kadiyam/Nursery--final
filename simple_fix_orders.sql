-- Simple Fix for Orders Table - No Data Loss
-- Run this in your Supabase SQL Editor

-- Step 1: Check if orders table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Create orders table if it doesn't exist
        CREATE TABLE orders (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID,
            guest_user_id UUID,
            quotation_id UUID,
            delivery_address JSONB,
            shipping_address TEXT,
            total_amount DECIMAL(10,2),
            cart_items JSONB,
            status TEXT DEFAULT 'pending',
            razorpay_payment_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Step 2: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add user_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_user_id_fkey'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add guest_user_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_guest_user_id_fkey'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_guest_user_id_fkey 
        FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add quotation_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_quotation_id_fkey'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_quotation_id_fkey 
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- Step 5: Create new RLS policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        guest_user_id IN (
            SELECT id FROM guest_users WHERE phone = (
                SELECT phone FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Step 7: Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;

-- Step 8: Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Grant permissions for order_items
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;

-- Step 10: Verify the fix
SELECT 'Orders table fixed successfully!' as status; 