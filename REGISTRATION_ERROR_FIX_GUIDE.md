# Registration Error Fix Guide

## Problem
You're experiencing a "Database error saving new user" with status 500 when trying to register new users. This is typically caused by problematic database triggers, RLS policies, or table structure issues.

## Solution Steps

### Step 1: Run the Diagnostic Script
First, run the diagnostic script to identify the exact issue:

```sql
-- Run this in your Supabase SQL editor
-- Copy and paste the contents of: diagnostic_registration_error.sql
```

This will show you:
- What triggers exist on auth.users
- RLS status on all tables
- Table structure issues
- Any problematic constraints

### Step 2: Apply the Fix
Run the comprehensive fix script:

```sql
-- Run this in your Supabase SQL editor
-- Copy and paste the contents of: fix_registration_error_final.sql
```

This script will:
1. Drop all problematic triggers on auth.users
2. Disable RLS on all related tables
3. Drop all RLS policies that might interfere
4. Ensure proper table structure
5. Test the fix

### Step 3: Test Registration
After running the fix:
1. Try registering a new user in your application
2. Check the browser console for any remaining errors
3. Verify the user appears in the user_profiles table

### Step 4: If Issues Persist
If you still get errors, check:

1. **Supabase Dashboard**: Go to your Supabase project dashboard
2. **Database**: Check the SQL editor for any error messages
3. **Logs**: Check the logs section for any database errors
4. **RLS**: Ensure RLS is disabled on user_profiles table

### Common Issues and Solutions

#### Issue: "relation does not exist"
- **Solution**: The user_profiles table might not exist. Create it:

```sql
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
```

#### Issue: "permission denied"
- **Solution**: RLS is still enabled. Run:

```sql
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
```

#### Issue: "duplicate key value"
- **Solution**: Email already exists. The application should handle this gracefully.

### Verification
After applying the fix, you should see:
- ✅ No triggers on auth.users
- ✅ RLS disabled on user_profiles
- ✅ No RLS policies on user_profiles
- ✅ Successful test insert into user_profiles

### Next Steps
Once registration is working:
1. Test the login functionality
2. Verify user profiles are created correctly
3. Test the admin dashboard if applicable
4. Re-enable RLS with proper policies if needed (optional)

## Quick Fix (If in a hurry)
If you need a quick fix, just run this minimal script:

```sql
-- Quick fix
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_user_profile ON auth.users;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
```

This should resolve the immediate registration issue.
