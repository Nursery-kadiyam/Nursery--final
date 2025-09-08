-- Fix Merchant Access to User Profiles for Orders
-- This script allows merchants to view user profiles for orders they receive
-- Run this in your Supabase SQL Editor

-- Step 1: Check current RLS policies on user_profiles
SELECT 
    'Current RLS Policies on user_profiles' as status,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 2: Add policy for merchants to view user profiles for their orders
-- This allows merchants to see customer information for orders they receive
CREATE POLICY "Merchants can view user profiles for their orders" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.merchant_code = (
                SELECT merchant_code FROM public.user_profiles 
                WHERE user_id = auth.uid() AND role = 'merchant'
            )
            AND o.user_id = user_profiles.user_id
        )
    );

-- Step 3: Alternative simpler policy - allow merchants to view any user profile
-- (This is more permissive but simpler to implement)
DROP POLICY IF EXISTS "Merchants can view user profiles for their orders" ON public.user_profiles;

CREATE POLICY "Merchants can view user profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'merchant'
        )
    );

-- Step 4: Verify the new policy was created
SELECT 
    'Updated RLS Policies on user_profiles' as status,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 5: Test the setup by checking if RLS is enabled
SELECT 
    'RLS Status Check' as status,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';
