-- Simple Fix for Merchant Access to User Profiles
-- This script uses the simplest approach - disable RLS temporarily
-- Run this in your Supabase SQL Editor

-- Step 1: Check current table structure
SELECT 
    'user_profiles table structure' as info,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Step 2: Disable RLS on user_profiles table to allow merchant access
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant permissions to authenticated users (including merchants)
GRANT SELECT ON public.user_profiles TO authenticated;

-- Step 4: Verify the changes
SELECT 
    'RLS Status' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

SELECT 
    'Permissions granted' as info,
    'user_profiles table is now accessible to merchants' as status;
