-- FIX RLS POLICIES - Remove merchant_id references
-- This script fixes the RLS policies by removing references to non-existent columns
-- Run this in your Supabase SQL Editor

-- 1. DROP EXISTING POLICIES WITH ERRORS
SELECT '=== DROPPING EXISTING POLICIES ===' as status;

-- Drop policies that reference non-existent merchant_id
DROP POLICY IF EXISTS "Merchants can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update orders for their products" ON public.orders;

-- 2. CREATE CORRECTED ORDERS POLICIES
SELECT '=== CREATING CORRECTED ORDERS POLICIES ===' as status;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

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

-- 3. CREATE SIMPLIFIED PRODUCTS POLICIES
SELECT '=== CREATING SIMPLIFIED PRODUCTS POLICIES ===' as status;

-- Anyone can view products (public catalog)
CREATE POLICY "Anyone can view products" ON public.products
    FOR SELECT USING (true);

-- Admins can manage all products
CREATE POLICY "Admins can manage all products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. VERIFICATION
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
    cmd
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

SELECT '=== RLS POLICIES FIXED SUCCESSFULLY ===' as status;
SELECT 'All RLS policies have been corrected and should work without errors.' as message;
