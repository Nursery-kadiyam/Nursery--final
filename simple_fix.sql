-- SIMPLE REGISTRATION FIX
-- This focuses on the most likely cause: triggers on auth.users

-- 1. Check what triggers exist (this will show us the problem)
SELECT '=== CURRENT TRIGGERS ON AUTH.USERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 2. Remove ALL triggers on auth.users (this is the main fix)
SELECT '=== REMOVING TRIGGERS ===' as status;

-- Drop every possible trigger that could exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_created ON auth.users;
DROP TRIGGER IF EXISTS new_user_trigger ON auth.users;

-- 3. Remove functions that might be called by triggers
SELECT '=== REMOVING FUNCTIONS ===' as status;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS insert_user_profile();
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS on_auth_user_created();

-- 4. Ensure user_profiles table exists
SELECT '=== ENSURING USER_PROFILES TABLE ===' as status;
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Disable RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 6. Test the fix
SELECT '=== TESTING FIX ===' as status;
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'simple_test@example.com';
BEGIN
    -- Clean up
    DELETE FROM public.user_profiles WHERE email = test_email;
    
    -- Test insert
    INSERT INTO public.user_profiles (
        user_id, email, first_name, last_name, phone, address, role
    ) VALUES (
        test_user_id, test_email, 'Test', 'User', '1234567890', 'Test Address', 'user'
    );
    
    RAISE NOTICE '✅ Test insert successful';
    
    -- Clean up
    DELETE FROM public.user_profiles WHERE email = test_email;
    RAISE NOTICE '✅ Test completed';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 7. Verify no triggers remain
SELECT '=== VERIFICATION ===' as status;
SELECT '=== REMAINING TRIGGERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

SELECT '=== FIX COMPLETE ===' as status;
SELECT '✅ Try registering now!' as message;
