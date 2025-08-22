# New Supabase Project Setup Guide

## ✅ API Keys Updated

Your Supabase configuration has been successfully updated to use your new project:

- **Project URL**: `https://nlrdxgcckfgsgivljmkf.supabase.co`
- **Anon Key**: Updated in `src/lib/supabase.ts`

## Next Steps for New Project

### 1. Set Up Database Tables

Run the registration fix script in your new Supabase project:

1. Go to your new Supabase Dashboard: https://supabase.com/dashboard/project/nlrdxgcckfgsgivljmkf
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix_registration_complete.sql`
4. Click **Run**

### 2. Create Required Tables

The script will create:
- ✅ `user_profiles` table with proper structure
- ✅ Disable RLS for registration
- ✅ Grant necessary permissions
- ✅ Create indexes for performance

### 3. Test the Setup

Run the test script to verify everything works:

1. In the same SQL Editor
2. Copy and paste the contents of `test_registration_after_fix.sql`
3. Click **Run**
4. Verify all tests pass

### 4. Set Up Authentication

In your Supabase Dashboard:

1. Go to **Authentication > Settings**
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Set up email templates if needed
4. Configure any additional auth providers (Google, etc.)

### 5. Test Registration

1. Start your development server: `npm run dev`
2. Go to your registration page
3. Try registering a new user
4. Check the browser console for any errors
5. Verify the user appears in your Supabase dashboard

## Environment Variables (Optional)

If you want to use environment variables instead of hardcoded values, create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://nlrdxgcckfgsgivljmkf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scmR4Z2Nja2Znc2dpdmxqbWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzI3MzEsImV4cCI6MjA3MTI0ODczMX0.jUvGwtvHII75px9cySp5_oxAf8-8aL8xKi9id8DvgF8
```

## Files Updated

- ✅ `src/lib/supabase.ts` - Updated with new project credentials
- ✅ `fix_registration_complete.sql` - Database setup script
- ✅ `test_registration_after_fix.sql` - Test script

## Troubleshooting

If you encounter issues:

1. **Check Supabase Dashboard**: Verify your project is active
2. **Check API Keys**: Ensure the keys are correct
3. **Run Test Script**: Use the test script to verify database setup
4. **Check Browser Console**: Look for any JavaScript errors
5. **Check Network Tab**: Look for failed API requests

## Security Note

Remember to:
- Keep your API keys secure
- Never commit `.env` files to version control
- Use environment variables in production
- Set up proper RLS policies once registration is working

## Support

If you need help:
1. Check the Supabase documentation
2. Review the error messages in browser console
3. Check Supabase logs in the dashboard
4. Ensure all required tables are created
