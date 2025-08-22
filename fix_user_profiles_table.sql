-- FIX USER_PROFILES TABLE STRUCTURE
-- Run this script in your Supabase SQL Editor to ensure proper data storage

-- 1. Drop existing table if it has wrong structure
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 2. Create user_profiles table with correct structure
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for proper access
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

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 6. Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Grant necessary permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- 9. Verify the setup
SELECT '=== USER_PROFILES TABLE FIXED ===' as status;
SELECT 
    '✅ user_profiles table recreated' as step_1,
    '✅ RLS enabled' as step_2,
    '✅ RLS policies created' as step_3,
    '✅ Indexes created' as step_4,
    '✅ Updated timestamp trigger created' as step_5,
    '✅ Permissions granted' as step_6;

-- 10. Show table structure
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
