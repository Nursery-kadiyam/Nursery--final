# Admin Dashboard Loading Fix Guide

## Problem
The admin dashboard is stuck on "Verifying admin access..." loading screen.

## Solution Steps

### Step 1: Run the Admin User Setup SQL
Execute the following SQL in your Supabase SQL editor:

```sql
-- Make the first user in the system admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = (SELECT user_id FROM user_profiles ORDER BY created_at ASC LIMIT 1);

-- Or make a specific user admin (replace with your email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify admin users
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
```

### Step 2: Check Your Current User
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Check if you're logged in with Supabase
4. Note your user email

### Step 3: Update Admin Emails (Optional)
If you want to use email-based admin access, update the admin emails in the code:

```typescript
// In src/pages/AdminDashboard.tsx, around line 90
const adminEmails = [
    'your-actual-email@example.com', // Replace with your email
    'admin@example.com'
];
```

### Step 4: Clear Browser Cache
1. Clear browser cache and cookies
2. Log out and log back in
3. Try accessing the admin dashboard again

### Step 5: Check Database Connection
Make sure your Supabase connection is working:
1. Check your environment variables
2. Verify Supabase project is active
3. Check RLS policies are not blocking access

### Step 6: Alternative Quick Fix
If the above doesn't work, you can temporarily bypass the admin check by modifying the code:

```typescript
// In src/pages/AdminDashboard.tsx, replace the auth check with:
if (!user) {
    navigate('/');
    return;
}

// Temporarily grant admin access to any authenticated user
const fallbackProfile = {
    id: user.id,
    user_id: user.id,
    first_name: user.user_metadata?.first_name || 'Admin',
    last_name: user.user_metadata?.last_name || 'User',
    email: user.email || '',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};
setUserProfile(fallbackProfile);
setAuthLoading(false);
```

## Common Issues and Solutions

### Issue 1: User profile not found
**Solution**: The code now automatically creates an admin profile for authenticated users.

### Issue 2: Database connection errors
**Solution**: Check your Supabase configuration and network connection.

### Issue 3: RLS policies blocking access
**Solution**: Temporarily disable RLS or update policies to allow admin access.

### Issue 4: Authentication state issues
**Solution**: Clear browser storage and re-authenticate.

## Verification
After applying the fix:
1. You should see the admin dashboard instead of the loading screen
2. Check browser console for any error messages
3. Verify that your user has admin role in the database

## Security Note
The current implementation includes fallback mechanisms for development. For production, ensure proper admin role verification is in place.
