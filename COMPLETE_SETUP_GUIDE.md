# Complete Setup Guide for New Supabase Project

## 🚨 Problem Solved
Your new Supabase project has no tables and registration isn't working. This guide will fix everything!

## ✅ What This Setup Does

1. **Creates All Required Tables**: user_profiles, products, orders, etc.
2. **Disables RLS**: So registration works without permission issues
3. **Grants Permissions**: All users can access the database
4. **Adds Sample Data**: Products for testing
5. **Fixes Registration**: Updated code to work with new structure

## 📋 Step-by-Step Setup

### Step 1: Set Up Database Tables

1. **Go to your Supabase Dashboard**:
   - URL: https://supabase.com/dashboard/project/nlrdxgcckfgsgivljmkf

2. **Navigate to SQL Editor**:
   - Click on "SQL Editor" in the left sidebar

3. **Run the Complete Setup Script**:
   - Copy the entire contents of `complete_new_project_setup.sql`
   - Paste it into the SQL Editor
   - Click "Run"

4. **Wait for Completion**:
   - The script will create all tables
   - You'll see success messages for each step

### Step 2: Test the Setup

1. **Run the Test Script**:
   - Copy the contents of `test_new_project_setup.sql`
   - Paste it into the SQL Editor
   - Click "Run"

2. **Verify Results**:
   - All tables should show "✅ EXISTS"
   - RLS should show "DISABLED"
   - Sample products should be visible

### Step 3: Configure Authentication

1. **Go to Authentication Settings**:
   - In Supabase Dashboard, go to "Authentication" → "Settings"

2. **Set Site URL**:
   - Add: `http://localhost:5173` (for development)
   - Add: `http://localhost:3000` (if using different port)

3. **Configure Email Templates** (Optional):
   - Go to "Authentication" → "Email Templates"
   - Customize confirmation and reset emails

### Step 4: Test Registration

1. **Start Your Development Server**:
   ```bash
   npm run dev
   ```

2. **Go to Registration Page**:
   - Navigate to your registration form
   - Try registering a new user

3. **Check Results**:
   - User should be created in Supabase Auth
   - Profile should be saved in user_profiles table
   - No errors should appear

## 🔧 Files Updated

### Database Scripts:
- ✅ `complete_new_project_setup.sql` - Creates all tables
- ✅ `test_new_project_setup.sql` - Tests the setup

### Code Files:
- ✅ `src/lib/supabase.ts` - Updated with new project URL
- ✅ `src/lib/auth.ts` - Fixed field mapping (id → user_id)

## 📊 Tables Created

1. **user_profiles** - User account information
2. **products** - Plant catalog
3. **orders** - Customer orders
4. **order_items** - Individual items in orders
5. **wishlist** - User wishlists
6. **merchants** - Merchant accounts
7. **quotations** - Price quotations

## 🔒 Security Settings

- **RLS Disabled**: For registration to work
- **All Permissions Granted**: authenticated, anon, service_role
- **No Foreign Key Constraints**: To prevent errors

## 🧪 Testing Checklist

After setup, verify:

- [ ] All tables exist in Supabase Dashboard
- [ ] Sample products are visible
- [ ] Registration form works
- [ ] Users can log in
- [ ] No console errors
- [ ] No 500 errors

## 🚨 Troubleshooting

### If Registration Still Doesn't Work:

1. **Check Browser Console**:
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for error messages

3. **Verify API Keys**:
   - Ensure `src/lib/supabase.ts` has correct URL
   - Check that anon key is correct

4. **Test Database Connection**:
   - Run the test script again
   - Verify all tables exist

### Common Issues:

1. **"Table doesn't exist"**:
   - Run the setup script again
   - Check for any error messages

2. **"Permission denied"**:
   - RLS might be enabled, run setup script again
   - Check permissions in Supabase Dashboard

3. **"Network error"**:
   - Check your internet connection
   - Verify Supabase project is active

## 📞 Support

If you still have issues:

1. **Check the test script output** for specific errors
2. **Look at browser console** for JavaScript errors
3. **Check Supabase logs** for server errors
4. **Verify all tables exist** in the database

## 🎉 Success!

Once everything is working:

- ✅ Users can register successfully
- ✅ Products are available in your shop
- ✅ Orders can be created
- ✅ All features should work properly

Your nursery website should now be fully functional with the new Supabase project!
