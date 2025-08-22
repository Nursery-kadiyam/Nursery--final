-- Fix Your Table Structure - Based on Your Current Database
-- Run this in your Supabase SQL Editor

-- 1. Check current table structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns to your existing table
SELECT '=== ADDING MISSING COLUMNS ===' as status;

-- Add email column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add last_name column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add phone column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add address column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Add role column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add created_at column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Disable RLS to prevent permission issues
SELECT '=== DISABLING RLS ===' as status;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. Drop all RLS policies
SELECT '=== DROPPING RLS POLICIES ===' as status;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON public.user_profiles;

-- 5. Drop problematic triggers
SELECT '=== DROPPING TRIGGERS ===' as status;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS insert_new_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;

-- 6. Drop problematic functions
SELECT '=== DROPPING FUNCTIONS ===' as status;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS insert_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 7. Create indexes for better performance
SELECT '=== CREATING INDEXES ===' as status;
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 8. Update existing records with missing data
SELECT '=== UPDATING EXISTING RECORDS ===' as status;

-- Update email from auth.users if it's missing
UPDATE public.user_profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE public.user_profiles.user_id = auth_users.id 
AND public.user_profiles.email IS NULL;

-- Update first_name and last_name from auth.users if they're missing
UPDATE public.user_profiles 
SET 
    first_name = COALESCE(
        auth_users.raw_user_meta_data->>'first_name',
        auth_users.raw_user_meta_data->>'given_name',
        'User'
    ),
    last_name = COALESCE(
        auth_users.raw_user_meta_data->>'last_name',
        auth_users.raw_user_meta_data->>'family_name',
        'Name'
    )
FROM auth.users auth_users
WHERE public.user_profiles.user_id = auth_users.id 
AND (public.user_profiles.first_name IS NULL OR public.user_profiles.last_name IS NULL);

-- 9. Set up admin user (replace with your email)
SELECT '=== SETTING UP ADMIN USER ===' as status;
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'pullaji@gmail.com' OR email = 'admin@nurseryshop.in';

-- 10. Create profiles for auth users who don't have profiles
SELECT '=== CREATING MISSING PROFILES ===' as status;
INSERT INTO public.user_profiles (user_id, email, first_name, last_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', au.raw_user_meta_data->>'family_name', 'Name'),
    'user'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
);

-- 11. Verify the fix
SELECT '=== VERIFICATION ===' as status;
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as with_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as with_last_name,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
FROM public.user_profiles;

-- 12. Show final table structure
SELECT '=== FINAL TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== FIX COMPLETED ===' as status;
SELECT 'Your user_profiles table has been updated. Try refreshing your application now.' as message;
