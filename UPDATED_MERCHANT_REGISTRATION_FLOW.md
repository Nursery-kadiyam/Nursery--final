# 🔄 UPDATED MERCHANT REGISTRATION FLOW

## 🎯 **New Data Storage Strategy**

**Separated Data Storage:**
- **Normal Users** → Store in `user_profiles` table
- **Merchants** → Store in `merchants` table (NOT in user_profiles)

## ✅ **Complete Fix Applied**

### **1. Updated Index.tsx Merchant Registration** (`src/pages/Index.tsx`)

**Simplified Registration Flow:**
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

// 2. Insert into merchants table ONLY ✅
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

**Simplified `register_merchant` function:**
```sql
CREATE OR REPLACE FUNCTION public.register_merchant(
    p_full_name TEXT,
    p_nursery_name TEXT,
    p_phone_number TEXT,
    p_email TEXT,
    p_nursery_address TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_merchant_code TEXT;
    v_year INTEGER;
    v_count INTEGER;
    v_next_number INTEGER;
    v_result JSONB;
BEGIN
    -- Generate merchant code
    v_year := EXTRACT(YEAR FROM NOW());
    SELECT COALESCE(COUNT(*), 0) INTO v_count
    FROM public.merchants
    WHERE merchant_code LIKE 'MC-' || v_year || '-%';
    v_next_number := v_count + 1;
    v_merchant_code := 'MC-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM public.merchants WHERE email = p_email) THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Email already registered',
            'message', 'This email is already registered as a merchant.'
        );
        RETURN v_result;
    END IF;
    
    -- Insert into merchants table ONLY (no user_profiles entry)
    INSERT INTO public.merchants (
        full_name,
        nursery_name,
        phone_number,
        email,
        nursery_address,
        merchant_code,
        status,
        user_id
    ) VALUES (
        p_full_name,
        p_nursery_name,
        p_phone_number,
        p_email,
        p_nursery_address,
        v_merchant_code,
        'pending',
        p_user_id
    );
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'merchant_code', v_merchant_code,
        'message', 'Merchant registration submitted successfully. Your request will be reviewed by our admin team.'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to register merchant. Please try again.'
        );
        RETURN v_result;
END;
$$;
```

### **3. Updated AdminAutoRedirect Component** (`src/components/AdminAutoRedirect.tsx`)

**Enhanced Role Checking:**
```typescript
// Check both user_profiles (for normal users) and merchants table (for merchants)
let userRole = null;

// First, check if user is a merchant
const { data: merchantData } = await supabase
  .from("merchants")
  .select("status, user_id")
  .eq("email", currentUser.email)
  .maybeSingle();

if (merchantData) {
  console.log('Found merchant record:', merchantData);
  userRole = 'merchant';
} else {
  // If not a merchant, check user_profiles for normal users
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("role, id")
    .eq("email", currentUser.email)
    .maybeSingle();
  
  if (profileData) {
    userRole = profileData.role;
  }
}

// Redirect based on role
if (userRole === 'admin') {
  navigate('/admin-dashboard');
} else if (userRole === 'merchant') {
  navigate('/merchant-dashboard');
}
```

### **4. Updated MyProfilePopup Component** (`src/components/ui/my-profile-popup.tsx`)

**Smart Profile Loading:**
```typescript
// First check if user is a merchant
const { data: merchantData } = await supabase
  .from("merchants")
  .select("full_name, phone_number, email")
  .eq("email", user.email)
  .maybeSingle();

if (merchantData) {
  // User is a merchant, use merchant data
  profileData = {
    first_name: merchantData.full_name.split(' ')[0] || merchantData.full_name,
    last_name: merchantData.full_name.split(' ').slice(1).join(' ') || '',
    email: merchantData.email,
    phone: merchantData.phone_number
  };
} else {
  // User is not a merchant, check user_profiles
  const { data: userProfileData } = await supabase
    .from("user_profiles")
    .select("first_name, last_name, email, phone")
    .eq("id", user.id)
    .maybeSingle();
  
  profileData = userProfileData;
}
```

## 📋 **Step-by-Step Implementation**

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
   - Record created ONLY in `merchants` table
   - NO record created in `user_profiles` table

### **Step 3: Test Normal User Registration**
1. **Register a normal user** through the regular signup form
2. **Verify** that record is created ONLY in `user_profiles` table
3. **Confirm** no record in `merchants` table

## 🔍 **What Was Changed**

### **Data Storage Separation:**
- ✅ **Merchants**: Store ONLY in `merchants` table
- ✅ **Normal Users**: Store ONLY in `user_profiles` table
- ✅ **No Duplication**: No more duplicate data across tables
- ✅ **Clear Separation**: Distinct data storage for different user types

### **Role Detection:**
- ✅ **Smart Checking**: Components check both tables for user type
- ✅ **Merchant Detection**: Identifies merchants by email in merchants table
- ✅ **User Detection**: Identifies normal users by email in user_profiles table
- ✅ **Proper Routing**: Routes merchants to merchant dashboard, users to appropriate pages

### **Profile Management:**
- ✅ **Merchant Profiles**: Load and update data from merchants table
- ✅ **User Profiles**: Load and update data from user_profiles table
- ✅ **Smart Updates**: Updates the correct table based on user type
- ✅ **Data Consistency**: Maintains data integrity across tables

## 🧪 **Testing Checklist**

### **Merchant Registration Test:**
- [ ] Fill merchant registration form
- [ ] Submit registration
- [ ] Verify record created in `merchants` table
- [ ] Confirm NO record in `user_profiles` table
- [ ] Check merchant_code generation
- [ ] Verify status = 'pending'

### **Normal User Registration Test:**
- [ ] Fill normal user registration form
- [ ] Submit registration
- [ ] Verify record created in `user_profiles` table
- [ ] Confirm NO record in `merchants` table
- [ ] Check role = 'user' (default)

### **Profile Management Test:**
- [ ] Login as merchant
- [ ] Open profile popup
- [ ] Verify data loads from merchants table
- [ ] Edit and save profile
- [ ] Confirm updates merchants table

- [ ] Login as normal user
- [ ] Open profile popup
- [ ] Verify data loads from user_profiles table
- [ ] Edit and save profile
- [ ] Confirm updates user_profiles table

### **Role-Based Routing Test:**
- [ ] Login as merchant
- [ ] Verify redirects to merchant dashboard
- [ ] Login as admin
- [ ] Verify redirects to admin dashboard
- [ ] Login as normal user
- [ ] Verify no special redirects

## 🚨 **Expected Results**

After applying these updates:

1. **Clean Data Storage**: No duplicate data across tables
2. **Proper Separation**: Merchants and users stored in appropriate tables
3. **Smart Detection**: Components automatically detect user type
4. **Correct Routing**: Users redirected to appropriate dashboards
5. **Profile Management**: Profile data managed from correct table
6. **No Errors**: Registration and profile management work smoothly

## 🔧 **If Issues Persist**

If you still see issues after applying the updates:

1. **Clear browser cache** and reload
2. **Check Supabase logs** for any remaining errors
3. **Verify table structure** in Supabase Table Editor
4. **Test with new email addresses** for both user types
5. **Check function permissions** in Supabase

The merchant registration should now properly separate data storage and work correctly for both merchant and normal user registrations!
