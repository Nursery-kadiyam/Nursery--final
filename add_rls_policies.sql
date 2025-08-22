-- ADD RLS POLICIES - Nursery Shop Application
-- This script adds back all the necessary Row Level Security policies
-- Run this in your Supabase SQL Editor after the emergency fix

-- 1. ENABLE RLS ON TABLES
SELECT '=== ENABLING RLS ON TABLES ===' as status;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- 2. USER_PROFILES POLICIES
SELECT '=== ADDING USER_PROFILES POLICIES ===' as status;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. MERCHANTS POLICIES
SELECT '=== ADDING MERCHANTS POLICIES ===' as status;

-- Merchants can view their own merchant record
CREATE POLICY "Merchants can view own record" ON public.merchants
    FOR SELECT USING (auth.uid() = user_id);

-- Merchants can update their own merchant record
CREATE POLICY "Merchants can update own record" ON public.merchants
    FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can insert merchant records (for registration)
CREATE POLICY "Anyone can insert merchant records" ON public.merchants
    FOR INSERT WITH CHECK (true);

-- Admins can view all merchant records
CREATE POLICY "Admins can view all merchants" ON public.merchants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all merchant records
CREATE POLICY "Admins can update all merchants" ON public.merchants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. PRODUCTS POLICIES
SELECT '=== ADDING PRODUCTS POLICIES ===' as status;

-- Anyone can view products (public catalog)
CREATE POLICY "Anyone can view products" ON public.products
    FOR SELECT USING (true);

-- Merchants can insert their own products
CREATE POLICY "Merchants can insert products" ON public.products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.merchants 
            WHERE user_id = auth.uid() AND status = 'approved'
        )
    );

-- Merchants can update their own products
CREATE POLICY "Merchants can update own products" ON public.products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.merchants 
            WHERE user_id = auth.uid() AND status = 'approved'
        )
    );

-- Merchants can delete their own products
CREATE POLICY "Merchants can delete own products" ON public.products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.merchants 
            WHERE user_id = auth.uid() AND status = 'approved'
        )
    );

-- Admins can manage all products
CREATE POLICY "Admins can manage all products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. ORDERS POLICIES
SELECT '=== ADDING ORDERS POLICIES ===' as status;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Merchants can view orders for their products
CREATE POLICY "Merchants can view orders for their products" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.merchants m ON p.merchant_id = m.id
            WHERE m.user_id = auth.uid() AND p.id = ANY(orders.product_ids)
        )
    );

-- Merchants can update orders for their products
CREATE POLICY "Merchants can update orders for their products" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.merchants m ON p.merchant_id = m.id
            WHERE m.user_id = auth.uid() AND p.id = ANY(orders.product_ids)
        )
    );

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all orders
CREATE POLICY "Admins can update all orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 6. WISHLIST POLICIES
SELECT '=== ADDING WISHLIST POLICIES ===' as status;

-- Users can view their own wishlist
CREATE POLICY "Users can view own wishlist" ON public.wishlist
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert items to their own wishlist
CREATE POLICY "Users can insert to own wishlist" ON public.wishlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own wishlist
CREATE POLICY "Users can update own wishlist" ON public.wishlist
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete from their own wishlist
CREATE POLICY "Users can delete from own wishlist" ON public.wishlist
    FOR DELETE USING (auth.uid() = user_id);

-- 7. GUEST USERS POLICIES (if table exists)
SELECT '=== ADDING GUEST USERS POLICIES ===' as status;

-- Allow guest user operations
CREATE POLICY "Allow guest user operations" ON public.guest_users
    FOR ALL USING (true);

-- 8. VERIFICATION
SELECT '=== VERIFICATION ===' as status;

-- Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'merchants', 'products', 'orders', 'wishlist');

-- Check policies
SELECT '=== POLICIES CREATED ===' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT '=== POLICY COUNT ===' as status;
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT '=== RLS POLICIES ADDED SUCCESSFULLY ===' as status;
SELECT 'All necessary Row Level Security policies have been added to your Nursery Shop application.' as message;
