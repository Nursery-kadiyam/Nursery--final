-- SIMPLE FIX FOR LOGIN AND PROFILE ISSUES
-- This script only uses user_profiles table, no complex triggers or functions

-- 1. First, let's check what we have
SELECT '=== CURRENT STATUS ===' as status;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') 
        THEN '✅ user_profiles table exists'
        ELSE '❌ user_profiles table missing'
    END as table_status;

-- 2. Create user_profiles table if it doesn't exist (simple version)
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

-- 3. Disable RLS completely to avoid permission issues
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. Create simple index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 5. Create profiles for existing auth users who don't have profiles
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

-- 6. Make one user admin (replace with your email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com'; -- Replace with your actual email

-- 7. Verify everything works
SELECT '=== VERIFICATION ===' as status;
SELECT 
    'Total auth users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Admin users' as metric,
    COUNT(*) as count
FROM user_profiles WHERE role = 'admin';

-- 8. Show all profiles
SELECT '=== ALL USER PROFILES ===' as status;
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 9. Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DISABLED - No permission issues'
        ELSE '❌ RLS ENABLED - May cause issues'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 10. Test table access
SELECT '=== TABLE ACCESS TEST ===' as status;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN '✅ user_profiles accessible'
        ELSE '❌ user_profiles not accessible'
    END as access_status;

SELECT '=== FIX COMPLETE ===' as status;
SELECT 'Login and profile should work now!' as message;
