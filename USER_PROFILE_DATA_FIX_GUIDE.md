# User Profile Data Storage Fix Guide

## 🎯 **Problem Solved**
- **Before**: User name and phone number were not being stored in the database
- **After**: All user data (name, phone, address) is properly saved to `user_profiles` table

## 🔧 **Root Cause**
The issue was caused by:
1. **Missing user metadata** in Supabase Auth signup
2. **Wrong column name** (`user_id` instead of `id`) in database queries
3. **Incomplete profile creation** during registration

## 🚀 **Fixes Applied**

### **1. Fixed Registration Flow** (`src/components/ui/login-popup.tsx`)

**Before:**
```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
    email: registerEmail,
    password: createPassword
});
```

**After:**
```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
    email: registerEmail,
    password: createPassword,
    options: {
        data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            address: address
        }
    }
});
```

### **2. Fixed Database Column Names**

**Changed from `user_id` to `id` in all queries:**
- Registration profile creation
- Login profile updates
- Profile fetching functions
- Auth callback profile creation

### **3. Enhanced Login Flow**

**Added automatic profile creation from metadata:**
```typescript
// If profile doesn't exist, create it from user metadata
if (!profile) {
    const profileData = {
        id: data.user.id,
        first_name: data.user.user_metadata?.first_name || '',
        last_name: data.user.user_metadata?.last_name || '',
        email: data.user.email,
        phone: data.user.user_metadata?.phone || null,
        address: data.user.user_metadata?.address || null
    };
    
    await supabase.from('user_profiles').insert([profileData]);
}
```

## 📋 **Step-by-Step Fix Instructions**

### **Step 1: Run Database Fix Script**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the contents of `fix_user_profiles_table.sql`
4. Click **Run**

This will:
- ✅ Recreate the `user_profiles` table with correct structure
- ✅ Set up proper RLS policies
- ✅ Create necessary indexes
- ✅ Grant proper permissions

### **Step 2: Test Registration**
1. **Register a new user** with:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe@example.com"
   - Phone: "+1234567890"
   - Address: "123 Main St"

2. **Check Supabase Auth**:
   - Go to Authentication > Users
   - Verify user is created
   - Check that `user_metadata` contains name and phone

3. **Check Database**:
   - Go to Table Editor > user_profiles
   - Verify profile record exists with all data

### **Step 3: Test Login**
1. **Confirm email** (click link in email)
2. **Login** with the same credentials
3. **Check profile** - name and phone should now appear

## 🔍 **Verification Steps**

### **Check Registration Data Storage:**
```sql
-- Check if user exists in auth.users
SELECT id, email, user_metadata 
FROM auth.users 
WHERE email = 'your-test-email@example.com';

-- Check if profile exists in user_profiles
SELECT * FROM user_profiles 
WHERE email = 'your-test-email@example.com';
```

### **Check Login Profile Creation:**
```sql
-- After login, verify profile was created/updated
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    address,
    created_at,
    updated_at
FROM user_profiles 
WHERE email = 'your-test-email@example.com';
```

## 🛠️ **Files Modified**

1. **`src/components/ui/login-popup.tsx`**:
   - Fixed registration to include user metadata
   - Fixed database column names (`user_id` → `id`)
   - Enhanced login flow with profile creation

2. **`src/lib/auth.ts`**:
   - Fixed all database queries to use correct column names
   - Updated profile creation logic

3. **`src/pages/AuthCallback.tsx`**:
   - Fixed OAuth profile creation
   - Updated column names

4. **`fix_user_profiles_table.sql`**:
   - Database structure fix script

## 🧪 **Testing Checklist**

### **Registration Test:**
- [ ] Fill registration form with all fields
- [ ] Submit registration
- [ ] Check email for confirmation
- [ ] Verify user appears in Supabase Auth
- [ ] Verify profile appears in user_profiles table
- [ ] Check that name and phone are stored

### **Login Test:**
- [ ] Confirm email by clicking link
- [ ] Login with credentials
- [ ] Verify profile data loads correctly
- [ ] Check that name and phone appear in profile

### **OAuth Test:**
- [ ] Login with Google
- [ ] Verify profile is created from OAuth data
- [ ] Check that name is extracted from Google profile

## 🚨 **Common Issues & Solutions**

### **"Profile not found" Error:**
- **Cause**: RLS policies blocking access
- **Solution**: Run the database fix script

### **"Column user_id does not exist" Error:**
- **Cause**: Wrong column name in queries
- **Solution**: All queries now use `id` instead of `user_id`

### **"Permission denied" Error:**
- **Cause**: Missing RLS policies
- **Solution**: Database fix script creates proper policies

## ✅ **Expected Results**

After applying these fixes:

1. **Registration**: All user data (name, phone, address) is stored in both:
   - Supabase Auth `user_metadata`
   - `user_profiles` table

2. **Login**: Profile data is automatically loaded and displayed

3. **OAuth**: Google login users get profiles created from their Google data

4. **Profile Updates**: Users can update their profile information

The user profile data should now be properly stored and displayed throughout your application!
