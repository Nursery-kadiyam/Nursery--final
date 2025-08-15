-- Fix Database Permissions and RLS Policies
-- Run this in your Supabase SQL editor

-- Step 1: Check if user_profiles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Step 2: Check RLS policies on user_profiles
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
WHERE tablename = 'user_profiles';

-- Step 3: Disable RLS temporarily to allow admin creation
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 4: Create admin profile for the specific user
INSERT INTO user_profiles (user_id, email, role, first_name, last_name, created_at)
VALUES (
    'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b',
    'pullajiabbireddy143@gmail.com',
    'admin',
    'Admin',
    'User',
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    email = 'pullajiabbireddy143@gmail.com',
    updated_at = NOW();

-- Step 5: Re-enable RLS with proper policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create proper RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 7: Verify the admin user was created
SELECT 
    id,
    user_id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM user_profiles 
WHERE user_id = 'f383ab66-3b51-4e3b-bf57-e79a8fc7c01b';

-- Step 8: Check all admin users
SELECT 
    id,
    user_id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
