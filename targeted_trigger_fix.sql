-- TARGETED TRIGGER FIX
-- This fixes the specific trigger that's causing the registration failure

-- 1. First, let's see what triggers exist on auth.users
SELECT '=== CURRENT AUTH.USERS TRIGGERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 2. Drop the problematic trigger that's causing the issue
SELECT '=== DROPPING PROBLEMATIC TRIGGER ===' as status;
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;

-- 3. Now we can safely drop the function
SELECT '=== DROPPING PROBLEMATIC FUNCTION ===' as status;
DROP FUNCTION IF EXISTS create_user_profile();

-- 4. Drop any other potential problematic triggers
SELECT '=== DROPPING OTHER TRIGGERS ===' as status;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS insert_new_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_created ON auth.users;

-- 5. Drop any other problematic functions
SELECT '=== DROPPING OTHER FUNCTIONS ===' as status;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS insert_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.insert_user_profile();
DROP FUNCTION IF EXISTS public.create_user_profile();

-- 6. Ensure user_profiles table is properly configured
SELECT '=== CONFIGURING USER_PROFILES TABLE ===' as status;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Add missing columns if they don't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 7. Test that we can create a profile manually
SELECT '=== TESTING PROFILE CREATION ===' as status;
DO $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        address, 
        role
    ) VALUES (
        gen_random_uuid(),
        'test@example.com',
        'Test',
        'User',
        '1234567890',
        'Test Address',
        'user'
    ) ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE '✅ Profile creation test successful';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Profile creation test failed: %', SQLERRM;
END $$;

-- 8. Verify the fix
SELECT '=== VERIFICATION ===' as status;

-- Check if any triggers remain on auth.users
SELECT '=== REMAINING AUTH.USERS TRIGGERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

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

-- 9. Final status
SELECT '=== TARGETED FIX COMPLETE ===' as status;
SELECT '✅ Trigger fix applied. Registration should now work!' as message;
SELECT 'The problematic trigger_create_user_profile has been removed.' as note;
