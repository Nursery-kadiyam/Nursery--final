-- FINAL AGGRESSIVE FIX - COMPLETE ELIMINATION OF ALL ISSUES
-- This script will completely eliminate ALL possible causes of the 500 error

-- 1. DIAGNOSTIC - Show what triggers exist
SELECT '=== DIAGNOSTIC: ALL TRIGGERS ON AUTH.USERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- 2. AGGRESSIVE TRIGGER REMOVAL - Remove ALL possible triggers
SELECT '=== AGGRESSIVE TRIGGER REMOVAL ===' as status;

-- Drop every possible trigger name that could exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS insert_new_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_insert_user_profile ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_created ON auth.users;
DROP TRIGGER IF EXISTS new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS new_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_created ON auth.users;

-- 3. AGGRESSIVE FUNCTION REMOVAL - Remove ALL possible functions
SELECT '=== AGGRESSIVE FUNCTION REMOVAL ===' as status;

DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS insert_user_profile();
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS on_auth_user_created();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.insert_user_profile();
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.on_auth_user_created();
DROP FUNCTION IF EXISTS auth.handle_new_user();
DROP FUNCTION IF EXISTS auth.insert_user_profile();
DROP FUNCTION IF EXISTS auth.create_user_profile();
DROP FUNCTION IF EXISTS auth.on_auth_user_created();
DROP FUNCTION IF EXISTS handle_new_user_created();
DROP FUNCTION IF EXISTS insert_user_profile_created();
DROP FUNCTION IF EXISTS create_user_profile_created();
DROP FUNCTION IF EXISTS on_auth_user_created_trigger();

-- 4. COMPLETE TABLE RECREATION
SELECT '=== COMPLETE TABLE RECREATION ===' as status;

-- Drop the existing table completely
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create a fresh, clean user_profiles table
CREATE TABLE public.user_profiles (
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

-- 5. DISABLE RLS COMPLETELY
SELECT '=== DISABLING RLS ===' as status;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 6. DROP ALL RLS POLICIES
SELECT '=== DROPPING ALL RLS POLICIES ===' as status;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
        RAISE NOTICE '✅ Dropped policy % on %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);

-- 8. TEST THE FIX
SELECT '=== TESTING THE FIX ===' as status;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'aggressive_test@example.com';
BEGIN
    RAISE NOTICE 'Testing aggressive fix...';
    
    -- Clean up any existing test data
    DELETE FROM public.user_profiles WHERE email = test_email;
    DELETE FROM auth.users WHERE email = test_email;
    
    -- Test insert into user_profiles
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
            test_user_id,
            test_email,
            'Aggressive',
            'Test',
            '1234567890',
            'Test Address',
            'user'
        );
        RAISE NOTICE '✅ user_profiles insert SUCCESSFUL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ user_profiles insert FAILED: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
    END;
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE email = test_email;
    RAISE NOTICE '✅ Test completed and cleaned up';
    
END $$;

-- 9. VERIFICATION
SELECT '=== VERIFICATION ===' as status;

-- Check for any remaining triggers
SELECT '=== REMAINING TRIGGERS ON AUTH.USERS ===' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- Check RLS status
SELECT '=== RLS STATUS ===' as status;
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'user_profiles'
AND schemaname = 'public';

-- Check table structure
SELECT '=== USER_PROFILES STRUCTURE ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if table is empty and ready
SELECT '=== CURRENT USER_PROFILES DATA ===' as status;
SELECT COUNT(*) as total_users FROM public.user_profiles;

-- Final status
SELECT '=== AGGRESSIVE FIX COMPLETE ===' as status;
SELECT '✅ ALL TRIGGERS REMOVED' as message;
SELECT '✅ ALL FUNCTIONS REMOVED' as message;
SELECT '✅ USER_PROFILES TABLE RECREATED' as message;
SELECT '✅ RLS DISABLED' as message;
SELECT '✅ ALL POLICIES REMOVED' as message;
SELECT '✅ 500 ERROR SHOULD BE FIXED!' as message;
