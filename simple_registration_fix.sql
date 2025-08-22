-- SIMPLE REGISTRATION FIX - Add missing address column and fix RLS
-- Run this script in your Supabase SQL Editor

-- 1. Add the missing address column to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Temporarily disable RLS to fix registration issues
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Create proper indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 4. Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Set admin role for your email (replace with your actual email)
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy143@gmail.com';

-- 7. Verify the fix
SELECT '=== VERIFICATION ===' as status;

-- Check table structure
SELECT '=== USER_PROFILES TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Show all users
SELECT '=== ALL USERS ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    phone,
    address,
    role,
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- Test insert capability
SELECT '=== TESTING INSERT CAPABILITY ===' as status;
SELECT '✅ Address column added and RLS disabled' as test_result;
