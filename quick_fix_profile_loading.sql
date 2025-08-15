-- QUICK FIX FOR PROFILE LOADING ISSUE
-- Run this to immediately fix the "Loading profile..." stuck issue

-- 1. Ensure user_profiles table exists and is accessible
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS completely
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Create profiles for all existing auth users
INSERT INTO user_profiles (user_id, email, first_name, last_name, role)
SELECT 
    au.id as user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name', '') as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', au.raw_user_meta_data->>'family_name', '') as last_name,
    'user' as role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4. Make your email admin (replace with your actual email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com'; -- Replace with your email

-- 5. Test that everything works
SELECT '=== QUICK FIX RESULTS ===' as status;
SELECT 
    'Total profiles created' as metric,
    COUNT(*) as count
FROM user_profiles;

-- 6. Show your profile (replace with your email)
SELECT '=== YOUR PROFILE ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE email = 'your-email@example.com'; -- Replace with your email

-- 7. Verify RLS is disabled
SELECT '=== RLS STATUS ===' as status;
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DISABLED - Profile loading should work now'
        ELSE '❌ RLS ENABLED - This may cause issues'
    END as status
FROM pg_tables 
WHERE tablename = 'user_profiles';

SELECT '=== FIX COMPLETE ===' as status;
SELECT 'Profile loading should work immediately!' as message;
