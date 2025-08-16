-- COMPLETE REGISTRATION FIX
-- Run this in your Supabase SQL editor

-- Step 1: Drop all existing policies and triggers
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON user_profiles;

DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS insert_new_user_profile ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Ensure user_profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add missing columns if they don't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Step 4: Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, role, created_at)
    VALUES (NEW.id, NEW.email, 'user', NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 6: Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 7: Create simple permissive policies
CREATE POLICY "Enable all operations for authenticated users" ON user_profiles
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 8: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 9: Update existing profiles to have user_id
UPDATE user_profiles 
SET user_id = au.id
FROM auth.users au
WHERE user_profiles.email = au.email
AND user_profiles.user_id IS NULL;

-- Step 10: Set admin role for your email
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'pullajiabbireddy143@gmail.com';

-- Step 11: Create admin profile if it doesn't exist
INSERT INTO user_profiles (user_id, email, role, created_at)
SELECT 
    au.id,
    au.email,
    'admin',
    au.created_at
FROM auth.users au
WHERE au.email = 'pullajiabbireddy143@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.email = au.email
);

-- Step 12: Verify the fix
SELECT 
    'REGISTRATION FIX COMPLETE' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
FROM user_profiles;

-- Step 13: Show your admin profile
SELECT 
    'YOUR ADMIN PROFILE' as check_type,
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email = 'pullajiabbireddy143@gmail.com';

