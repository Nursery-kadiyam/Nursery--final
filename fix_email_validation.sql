-- Email Validation Fix Script
-- This script helps diagnose and fix email validation issues in Supabase

-- 1. Check current auth settings (if accessible)
-- Note: These settings are typically managed through Supabase Dashboard
SELECT 
    'Auth Settings Check' as check_type,
    'Email validation settings are managed through Supabase Dashboard' as note;

-- 2. Check if there are any email-related policies that might be blocking registration
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
WHERE tablename LIKE '%auth%' 
   OR tablename LIKE '%user%'
   OR policyname LIKE '%email%';

-- 3. Check for any triggers that might be affecting email validation
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table LIKE '%auth%' 
   OR event_object_table LIKE '%user%'
   OR trigger_name LIKE '%email%';

-- 4. Check user_profiles table structure to ensure email field is properly configured
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
   OR table_name = 'users'
ORDER BY table_name, ordinal_position;

-- 5. Check for any RLS policies that might be blocking email operations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE qual LIKE '%email%' 
   OR with_check LIKE '%email%';

-- 6. Test email format validation function (if exists)
-- This helps identify if there are custom email validation functions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%email%' 
   OR routine_definition LIKE '%email%';

-- 7. Check for any domain restrictions in the database
-- Look for any tables or functions that might contain domain allowlists/blocklists
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name LIKE '%domain%' 
   OR column_name LIKE '%email%'
   OR column_name LIKE '%provider%';

-- 8. Recommendations for fixing email validation issues:

-- Option A: If you have access to Supabase Dashboard
-- 1. Go to Authentication > Settings
-- 2. Check "Email Templates" and "Email Settings"
-- 3. Verify "Enable email confirmations" is properly configured
-- 4. Check for any domain restrictions in "Email Templates"

-- Option B: If the issue persists, try these steps:
-- 1. Test with different email providers (Outlook, Yahoo, etc.)
-- 2. Check if the issue is specific to Gmail addresses
-- 3. Verify Supabase project settings for email validation
-- 4. Consider creating a new Supabase project for testing

-- Option C: Temporary workaround (if needed)
-- Create a function to bypass email validation for testing
CREATE OR REPLACE FUNCTION test_email_validation(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic email format validation
    IF email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT test_email_validation('test@outlook.com') as is_valid_outlook;
SELECT test_email_validation('nani@gmail.com') as is_valid_gmail;
SELECT test_email_validation('test@yahoo.com') as is_valid_yahoo;

-- 9. Check for any recent changes that might have affected email validation
SELECT 
    'Recent Changes Check' as check_type,
    'Check Supabase project logs for recent authentication changes' as note;

-- 10. Final recommendations
SELECT 
    'Final Recommendations' as recommendation_type,
    '1. Try registration with test@outlook.com or test@yahoo.com' as step_1,
    '2. Check Supabase Dashboard > Authentication > Settings' as step_2,
    '3. Verify email confirmation settings' as step_3,
    '4. Test with a real email address if available' as step_4;
