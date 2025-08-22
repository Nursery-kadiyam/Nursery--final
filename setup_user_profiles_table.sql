-- SETUP USER_PROFILES TABLE WITH RLS POLICIES
-- Run this script in your Supabase SQL Editor

-- 1. Create user_profiles table with proper structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.user_profiles
    FOR DELETE USING (auth.uid() = id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 5. Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Test the setup
SELECT '=== USER_PROFILES TABLE SETUP COMPLETE ===' as status;
SELECT 
    '✅ user_profiles table created' as step_1,
    '✅ RLS enabled' as step_2,
    '✅ RLS policies created' as step_3,
    '✅ Indexes created' as step_4,
    '✅ Updated timestamp trigger created' as step_5;

-- 8. Verify table structure
SELECT '=== TABLE STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
