# 🔹 Registration Flow Guide

## 📋 Registration Flow Overview

### Step 1: Signup (Auth table lo save avvadu) ✅
```
Email + Password → auth.users table lo save ayyi, user ki id generate avutundi
```

### Step 2: Profile Insert (user_profiles table lo save avvadu) ❌
```
Signup success ayyaka user.id use chesi → user_profiles table lo extra info save cheyyali
```

## 🚨 Current Problem

**Step 1** is working correctly - users are being created in `auth.users` table.

**Step 2** is failing - profiles are not being saved in `user_profiles` table.

## 🔧 Solution

### 1. First, Set Up Your Database

Run the complete setup script in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/nlrdxgcckfgsgivljmkf
2. Click **SQL Editor**
3. Copy and paste the entire contents of `complete_new_project_setup.sql`
4. Click **Run**

### 2. Test the Registration Flow

Run the test script to verify everything works:

1. Copy the contents of `test_registration_flow.sql`
2. Paste it into the SQL Editor
3. Click **Run**

### 3. Verify Results

You should see:
- ✅ `user_profiles table EXISTS`
- ✅ `RLS DISABLED - Registration should work`
- ✅ `Step 2 SUCCESSFUL: Profile inserted into user_profiles table`
- ✅ `READY FOR REGISTRATION`

## 📊 Registration Flow Details

### Step 1: Auth Signup
```javascript
// This happens in auth.ts
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      address: formData.address
    }
  }
});
```

**Result**: User created in `auth.users` table with unique ID

### Step 2: Profile Creation
```javascript
// This happens in auth.ts
const profileData = {
  user_id: authData.user.id, // Use the auth user's ID
  email: formData.email,
  first_name: formData.first_name,
  last_name: formData.last_name,
  phone: formData.phone || null,
  address: formData.address || null,
  role: 'user'
};

const { data: profileInsertData, error: profileError } = await supabase
  .from('user_profiles')
  .insert([profileData])
  .select()
  .single();
```

**Result**: Profile saved in `user_profiles` table

## 🔍 Debugging Steps

### If Step 2 is Failing:

1. **Check Browser Console**:
   - Look for error messages
   - Check the network tab for failed requests

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for error messages

3. **Run the Test Script**:
   - Use `test_registration_flow.sql` to verify database setup

4. **Common Issues**:
   - Table doesn't exist → Run setup script
   - RLS enabled → Run setup script
   - Permission denied → Run setup script

## 📋 Database Tables Required

### 1. `auth.users` (Automatic - Supabase creates this)
- `id` (UUID) - Primary key
- `email` (TEXT) - User email
- `encrypted_password` (TEXT) - Hashed password
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 2. `public.user_profiles` (We create this)
- `id` (UUID) - Primary key
- `user_id` (UUID) - References auth.users(id)
- `email` (TEXT) - User email
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name
- `phone` (TEXT) - User's phone number
- `address` (TEXT) - User's address
- `role` (TEXT) - User role (user/admin/merchant)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🎯 Expected Results

After running the setup:

1. **Registration Form**: Users can fill out the form
2. **Step 1**: User created in `auth.users` table
3. **Step 2**: Profile created in `user_profiles` table
4. **Success**: User can log in and access their profile

## 🚨 Troubleshooting

### If registration still doesn't work:

1. **Check if tables exist**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'user_profiles';
   ```

2. **Check RLS status**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE tablename = 'user_profiles';
   ```

3. **Test manual insert**:
   ```sql
   INSERT INTO public.user_profiles (user_id, email, first_name, last_name, role) 
   VALUES (gen_random_uuid(), 'test@example.com', 'Test', 'User', 'user');
   ```

## 📞 Support

If you still have issues:

1. Run `test_registration_flow.sql` and share the results
2. Check browser console for JavaScript errors
3. Check Supabase logs for server errors
4. Ensure all tables exist in your database

## 🎉 Success!

Once everything is working:

- ✅ Step 1: Users created in `auth.users`
- ✅ Step 2: Profiles saved in `user_profiles`
- ✅ Registration flow complete
- ✅ Users can log in and access their data
