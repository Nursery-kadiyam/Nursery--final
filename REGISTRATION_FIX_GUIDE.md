# Registration Fix Guide

## Problem
Your registration form is not saving data to the database, even though manual database insertion works.

## Root Cause
The issue is likely caused by:
1. **Row Level Security (RLS) policies** blocking the registration
2. **Incorrect table structure** in the `user_profiles` table
3. **Missing permissions** for authenticated users
4. **Incorrect field mapping** in the registration code

## Solution

### Step 1: Run the Database Fix
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `fix_registration_complete.sql`
4. Run the script

This script will:
- ✅ Disable RLS on all tables
- ✅ Drop all problematic RLS policies
- ✅ Recreate the `user_profiles` table with proper structure
- ✅ Grant necessary permissions
- ✅ Test the fix

### Step 2: Verify the Fix
1. Run the `test_registration_after_fix.sql` script in Supabase SQL Editor
2. Check that all tests pass
3. Verify that manual insert works

### Step 3: Test Registration
1. Go to your website
2. Try to register a new user
3. Check the browser console for any errors
4. Verify the user appears in the database

## What the Fix Does

### Database Changes:
- **Disables RLS**: Removes security policies that were blocking registration
- **Recreates Table**: Ensures proper table structure with correct fields
- **Grants Permissions**: Gives authenticated users permission to insert data
- **Adds Indexes**: Improves performance

### Code Changes:
- **Fixed Field Mapping**: Changed `id` to `user_id` in the profile creation
- **Added Error Logging**: Better debugging information
- **Improved Error Handling**: More detailed error messages

## Expected Results

After running the fix:
- ✅ Registration form should work
- ✅ Users should be created in both `auth.users` and `user_profiles` tables
- ✅ No more 500 errors during registration
- ✅ Users can log in after registration

## Troubleshooting

If registration still doesn't work:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Look for failed API requests
3. **Check Supabase Logs**: Look for server-side errors
4. **Run Test Script**: Use `test_registration_after_fix.sql` to verify database setup

## Security Note

The fix temporarily disables RLS for registration. Once registration is working, you can re-enable RLS with proper policies:

```sql
-- Re-enable RLS with proper policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Add policies that allow registration
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);
```

## Files Modified

1. `fix_registration_complete.sql` - Database fix script
2. `test_registration_after_fix.sql` - Test script
3. `src/lib/auth.ts` - Updated registration logic
4. `REGISTRATION_FIX_GUIDE.md` - This guide

## Support

If you still have issues after following this guide:
1. Check the browser console for errors
2. Run the test script to verify database setup
3. Check Supabase logs for server errors
4. Ensure your Supabase URL and API key are correct
