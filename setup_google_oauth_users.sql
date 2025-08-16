-- Setup Google OAuth User Profile Handling
-- Run this in your Supabase SQL editor

-- Step 1: Check current user_profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Step 2: Ensure user_profiles table has the correct RLS policies for OAuth users
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 3: Test the setup
SELECT 
    'RLS Policies Check' as test_name,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
