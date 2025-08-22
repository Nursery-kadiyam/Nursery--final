# 🚨 MERCHANT PROFILE CREATION FIX

## 🎯 **Problem Identified**
When users register through the merchant form:
1. **Missing Profile Data**: First name, last name, and phone are not saved to `user_profiles` table
2. **Wrong Role**: User role is not set to 'merchant' in the profile
3. **Incomplete Registration**: Only merchant record is created, but user profile is missing

## ✅ **Complete Fix Applied**

### **1. Updated Index.tsx Merchant Registration** (`src/pages/Index.tsx`)

**Enhanced Registration Flow:**
```typescript
// 1. Create Supabase Auth user ✅
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: form.email,
  password: form.password,
  options: {
    data: {
      full_name: form.fullName,
      nursery_name: form.nurseryName,
      phone_number: form.phoneNumber,
    }
  }
});

// 2. Create user profile with merchant role ✅
const { error: profileError } = await supabase.from('user_profiles').insert([
  {
    id: authData.user?.id,
    first_name: form.fullName.split(' ')[0] || form.fullName,
    last_name: form.fullName.split(' ').slice(1).join(' ') || '',
    email: form.email,
    phone: form.phoneNumber,
    role: 'merchant'  // ✅ Set role to merchant
  }
]);

// 3. Insert into merchants table ✅
const { error: dbError } = await supabase.from('merchants').insert([
  {
    full_name: form.fullName,
    nursery_name: form.nurseryName,
    phone_number: form.phoneNumber,
    email: form.email,
    nursery_address: form.nurseryAddress,
    merchant_code: merchantCode,
    status: 'pending',
    user_id: authData.user?.id || null
  }
]);
```

### **2. Updated Database Function** (`fix_merchant_registration_complete.sql`)

**Enhanced `register_merchant` function:**
```sql
CREATE OR REPLACE FUNCTION public.register_merchant(
    p_full_name TEXT,
    p_nursery_name TEXT,
    p_phone_number TEXT,
    p_email TEXT,
    p_nursery_address TEXT,
    p_user_id UUID DEFAULT NULL  -- ✅ Added user_id parameter
)
```

**Profile Creation Logic:**
```sql
-- Split full name into first and last name
v_first_name := SPLIT_PART(p_full_name, ' ', 1);
v_last_name := CASE 
    WHEN POSITION(' ' IN p_full_name) > 0 
    THEN SUBSTRING(p_full_name FROM POSITION(' ' IN p_full_name) + 1)
    ELSE ''
END;

-- If user_id is provided, create user profile with merchant role
IF p_user_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (
        id,
        first_name,
        last_name,
        email,
        phone,
        role
    ) VALUES (
        p_user_id,
        v_first_name,
        v_last_name,
        p_email,
        p_phone_number,
        'merchant'  -- ✅ Set role to merchant
    );
END IF;
```

### **3. Updated RegisterMerchant.tsx** (`src/pages/RegisterMerchant.tsx`)

**Enhanced Function Call:**
```typescript
// Get current user if logged in
const { data: { user } } = await supabase.auth.getUser();

// Use the database function with user_id
const { data: result, error } = await supabase.rpc('register_merchant', {
    p_full_name: data.fullName,
    p_nursery_name: data.nurseryName,
    p_phone_number: data.phoneNumber,
    p_email: data.email,
    p_nursery_address: data.nurseryAddress,
    p_user_id: user?.id || null  // ✅ Pass user_id
});
```

## 📋 **Step-by-Step Fix Instructions**

### **Step 1: Run Updated Database Script**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the updated `fix_merchant_registration_complete.sql`
4. Click **Run**

### **Step 2: Test Merchant Registration**
1. **Fill the merchant registration form** with:
   - Full Name: "John Doe"
   - Nursery Name: "Green Thumb Nursery"
   - Phone Number: "+1234567890"
   - Email: "john@greenthumb.com"
   - Nursery Address: "123 Garden Street, City, State"

2. **Submit the form** and verify:
   - No database errors
   - Success message appears
   - User profile created with merchant role
   - Merchant record created

### **Step 3: Verify Database Records**
1. **Check Supabase Table Editor** > `user_profiles`
   - Verify record exists with `role = 'merchant'`
   - Check `first_name`, `last_name`, `phone` are populated
   - Confirm `email` matches registration

2. **Check Supabase Table Editor** > `merchants`
   - Verify merchant record exists
   - Check `user_id` links to the user profile

## 🔍 **What Was Fixed**

### **Profile Creation Issues:**
- ✅ **Missing Profile**: Now creates user profile during merchant registration
- ✅ **Wrong Role**: Sets role to 'merchant' instead of default 'user'
- ✅ **Missing Data**: Properly saves first name, last name, and phone
- ✅ **Name Splitting**: Automatically splits full name into first and last name

### **Registration Flow:**
- ✅ **Complete Flow**: Auth user → Profile → Merchant record
- ✅ **Error Handling**: Better error messages for each step
- ✅ **Data Consistency**: Ensures all data is properly saved
- ✅ **Role Assignment**: Correctly assigns merchant role

### **Database Functions:**
- ✅ **Enhanced Function**: Updated to handle user profile creation
- ✅ **Name Processing**: Automatically splits full names
- ✅ **Role Setting**: Sets merchant role in user profile
- ✅ **User Linking**: Links merchant record to user profile

## 🧪 **Testing Checklist**

### **Registration Test:**
- [ ] Fill merchant registration form
- [ ] Submit registration
- [ ] Verify no database errors
- [ ] Check user profile created with merchant role
- [ ] Verify first name, last name, phone are saved
- [ ] Check merchant record created and linked

### **Profile Verification:**
- [ ] Check user_profiles table for new record
- [ ] Verify role = 'merchant'
- [ ] Confirm first_name and last_name are correct
- [ ] Check phone number is saved
- [ ] Verify email matches registration

### **Merchant Record Verification:**
- [ ] Check merchants table for new record
- [ ] Verify user_id links to user profile
- [ ] Confirm merchant_code is generated
- [ ] Check status = 'pending'

## 🚨 **Expected Results**

After applying these fixes:

1. **Complete Profile**: User profiles are created with all required data
2. **Correct Role**: All merchant registrations get 'merchant' role
3. **Data Consistency**: First name, last name, phone are properly saved
4. **Proper Linking**: Merchant records are linked to user profiles
5. **No Errors**: Registration completes without database errors

## 🔧 **If Issues Persist**

If you still see issues after applying the fixes:

1. **Clear browser cache** and reload
2. **Check Supabase logs** for any remaining errors
3. **Verify table structure** in Supabase Table Editor
4. **Test with a new email address**
5. **Check function permissions** in Supabase

The merchant registration should now properly create user profiles with the correct role and data!
