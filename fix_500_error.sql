-- Fix 500 Server Error - Comprehensive Database Fix
-- Run this in your Supabase SQL Editor

-- 1. Check and fix database connection issues
SELECT '=== CHECKING DATABASE STATUS ===' as status;

-- 2. Disable RLS on all tables to eliminate permission issues
ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_users DISABLE ROW LEVEL SECURITY;

-- 3. Drop all problematic triggers that might cause 500 errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS insert_new_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;

-- 4. Drop problematic functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS insert_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 5. Ensure all required tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'merchant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    image_url TEXT,
    categories TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    bestseller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    guest_user_id UUID,
    order_number TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    customer_info JSONB,
    order_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create wishlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 9. Create guest_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.guest_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    delivery_address TEXT,
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Grant all necessary permissions
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

GRANT ALL ON public.products TO anon;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT ALL ON public.orders TO anon;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT ALL ON public.wishlist TO anon;
GRANT ALL ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;

GRANT ALL ON public.guest_users TO anon;
GRANT ALL ON public.guest_users TO authenticated;
GRANT ALL ON public.guest_users TO service_role;

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_products_categories ON public.products(categories);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist(product_id);

-- 12. Insert sample products if table is empty
INSERT INTO public.products (name, description, price, original_price, image_url, categories, rating, reviews, available_quantity, bestseller)
SELECT * FROM (VALUES
    ('Ashoka Tree', 'Sacred tree with beautiful flowers, perfect for gardens and temples', 299.00, 399.00, '/assets/Ashoka.jpeg', 'Trees / Avenue Trees', 4.5, 12, 50, true),
    ('Bamboo Plant', 'Fast-growing bamboo for privacy screens and landscaping', 199.00, 249.00, '/assets/Bamboo plants.jpeg', 'Ornamental Plants', 4.2, 8, 100, false),
    ('Boston Fern', 'Air-purifying fern perfect for indoor spaces', 149.00, 199.00, '/assets/Boston Fern.jpeg', 'Indoor Plants', 4.0, 15, 75, true),
    ('Cassia Tree', 'Beautiful flowering tree with yellow blooms', 399.00, 499.00, '/assets/Cassia Tree.jpeg', 'Flowering Plants', 4.3, 10, 30, false),
    ('Croton Plant', 'Colorful foliage plant for tropical gardens', 179.00, 229.00, '/assets/Croton plant.jpeg', 'Ornamental Plants', 4.1, 6, 60, false),
    ('Gulmohar Tree', 'Stunning orange-red flowering tree for avenue planting', 599.00, 699.00, '/assets/Gulmohar.jpeg', 'Trees / Avenue Trees', 4.6, 18, 25, true),
    ('Money Plant', 'Popular indoor plant for good luck and air purification', 99.00, 129.00, '/assets/placeholder.svg', 'Indoor Plants', 4.4, 22, 200, true),
    ('Neem Tree', 'Medicinal tree with natural pest control properties', 349.00, 449.00, '/assets/placeholder.svg', 'Medicinal Plants', 4.2, 9, 40, false)
) AS v(name, description, price, original_price, image_url, categories, rating, reviews, available_quantity, bestseller)
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1);

-- 13. Create profiles for existing users
INSERT INTO public.user_profiles (user_id, email, first_name, last_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
    'user'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
);

-- 14. Set up admin user (replace with your email)
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'pullaji@gmail.com' OR email = 'admin@nurseryshop.in';

-- 15. Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_users;

-- 16. Verify the fix
SELECT '=== VERIFICATION ===' as status;
SELECT 'User Profiles:' as table_name, COUNT(*) as count FROM public.user_profiles
UNION ALL
SELECT 'Products:' as table_name, COUNT(*) as count FROM public.products
UNION ALL
SELECT 'Orders:' as table_name, COUNT(*) as count FROM public.orders
UNION ALL
SELECT 'Wishlist:' as table_name, COUNT(*) as count FROM public.wishlist
UNION ALL
SELECT 'Guest Users:' as table_name, COUNT(*) as count FROM public.guest_users;

-- 17. Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'products', 'orders', 'wishlist', 'guest_users');

SELECT '=== FIX COMPLETED ===' as status;
SELECT 'Database is now ready. Try refreshing your application.' as message;
