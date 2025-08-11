# Database Setup Guide

## Fix Profile Creation Permission Error

The error you're encountering is due to missing database tables and Row Level Security (RLS) policies. Follow these steps to fix it:

### Step 1: Run the Database Setup

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the entire contents of `supabase_setup.sql` into the editor
5. Click "Run" to execute the SQL

### Step 2: Verify Tables Created

After running the setup, you should have these tables:
- `user_profiles` - for authenticated users
- `guest_users` - for guest checkout users
- `orders` - for order management

### Step 3: Test Registration

Try registering a new user. The system will now:
1. Create the user in Supabase Auth
2. Try to create a profile in `user_profiles` table
3. If that fails due to RLS policies, it will fallback to `guest_users` table
4. Show appropriate success/error messages

### Step 4: Check RLS Policies

The setup includes these RLS policies:

**user_profiles table:**
- Users can only access their own profile data
- Requires authentication

**guest_users table:**
- Public access (no authentication required)
- Used for guest checkout

**orders table:**
- Users can view/update their own orders
- Supports both authenticated and guest users

### Troubleshooting

If you still get permission errors:

1. **Check if tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_profiles', 'guest_users', 'orders');
   ```

2. **Check RLS policies:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename IN ('user_profiles', 'guest_users', 'orders');
   ```

3. **Verify user authentication:**
   - Make sure the user is properly authenticated before trying to create a profile
   - Check that `auth.uid()` returns the correct user ID

### Alternative Solution

If you continue to have issues, you can temporarily disable RLS for testing:

```sql
-- Disable RLS temporarily (for testing only)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Only disable RLS temporarily for testing. Re-enable it for production:

```sql
-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### Contact Support

If you're still experiencing issues after following these steps, please:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure your API keys are correct in `src/lib/supabase.ts` 