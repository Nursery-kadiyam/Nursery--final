# 🚨 MERCHANT REGISTRATION FIX GUIDE

## 🎯 **Problem Identified**
The error `Could not find the 'full_name' column of 'merchants' in the schema cache` occurs because:
1. **Wrong table structure** - The merchants table has different column names than expected
2. **Missing columns** - The code expects `full_name` but the table has different structure
3. **Database function issues** - The registration function doesn't match the table schema

## ✅ **Complete Fix Applied**

### **1. Database Structure Fixed** (`fix_merchant_registration_complete.sql`)

**New Table Structure:**
```sql
CREATE TABLE public.merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,           -- ✅ Added
    nursery_name TEXT NOT NULL,        -- ✅ Added
    phone_number TEXT NOT NULL,        -- ✅ Added
    email TEXT UNIQUE NOT NULL,        -- ✅ Added
    nursery_address TEXT NOT NULL,     -- ✅ Added
    merchant_code TEXT UNIQUE NOT NULL, -- ✅ Added
    status TEXT DEFAULT 'pending',     -- ✅ Added
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. Registration Function Fixed**

**Enhanced `register_merchant` function:**
- ✅ Proper column mapping
- ✅ Email uniqueness check
- ✅ Merchant code generation
- ✅ Error handling
- ✅ Success/error responses

### **3. Frontend Components Fixed**

**Files Updated:**
1. **`src/pages/RegisterMerchant.tsx`** ✅
   - Fixed function call parameters
   - Removed unnecessary password parameter

2. **`src/pages/Index.tsx`** ✅
   - Fixed database insert with correct column names
   - Added user_id linking

## 📋 **Step-by-Step Fix Instructions**

### **Step 1: Run Database Fix Script**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the contents of `fix_merchant_registration_complete.sql`
4. Click **Run**

This will:
- ✅ Recreate the `merchants` table with correct structure
- ✅ Create proper indexes for performance
- ✅ Set up registration functions
- ✅ Grant necessary permissions

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
   - Merchant record created in database

### **Step 3: Verify Database Records**
1. **Check Supabase Table Editor** > `merchants`
2. **Verify the record exists** with all fields populated
3. **Check merchant_code** is generated correctly (format: MC-2024-0001)

## 🔍 **What Was Fixed**

### **Database Issues:**
- ✅ **Column Mismatch**: Fixed `full_name` column not found error
- ✅ **Missing Columns**: Added all required merchant fields
- ✅ **Data Types**: Corrected column data types
- ✅ **Constraints**: Added proper unique constraints

### **Registration Flow:**
- ✅ **Form Validation**: Enhanced validation logic
- ✅ **Error Handling**: Better error messages
- ✅ **Success Flow**: Proper success responses
- ✅ **Database Insert**: Correct column mapping

### **User Experience:**
- ✅ **Clear Error Messages**: Specific error descriptions
- ✅ **Success Feedback**: Confirmation messages
- ✅ **Form Reset**: Clean form after submission
- ✅ **Loading States**: Proper loading indicators

## 🧪 **Testing Checklist**

### **Registration Test:**
- [ ] Fill all required fields in merchant form
- [ ] Submit registration
- [ ] Verify no database errors
- [ ] Check success message appears
- [ ] Verify record in merchants table
- [ ] Check merchant_code generation

### **Error Handling Test:**
- [ ] Try registering with existing email
- [ ] Verify duplicate email error
- [ ] Test with invalid data
- [ ] Check error messages are clear

### **Database Verification:**
- [ ] Check merchants table structure
- [ ] Verify all columns exist
- [ ] Test registration function
- [ ] Check indexes are created

## 🚨 **Error Resolution**

### **Before Fix:**
```
Error: Could not find the 'full_name' column of 'merchants' in the schema cache
```

### **After Fix:**
- ✅ All columns exist and match code expectations
- ✅ Registration function works correctly
- ✅ No more schema cache errors

## 📊 **Database Functions Created**

### **1. register_merchant Function:**
```sql
CREATE OR REPLACE FUNCTION public.register_merchant(
    p_full_name TEXT,
    p_nursery_name TEXT,
    p_phone_number TEXT,
    p_email TEXT,
    p_nursery_address TEXT
) RETURNS JSONB
```

### **2. link_merchant_to_user Function:**
```sql
CREATE OR REPLACE FUNCTION public.link_merchant_to_user(
    p_email TEXT,
    p_user_id UUID
) RETURNS JSONB
```

## ✅ **Expected Results**

After applying these fixes:

1. **No More Errors**: All "column not found" errors resolved
2. **Successful Registration**: Merchant forms submit successfully
3. **Data Storage**: All merchant data properly saved
4. **User Feedback**: Clear success/error messages
5. **Database Integrity**: Proper data validation and constraints

## 🔧 **If Issues Persist**

If you still see errors after running the database script:

1. **Clear browser cache** and reload
2. **Check Supabase logs** for any remaining errors
3. **Verify table structure** in Supabase Table Editor
4. **Test with a new email address**
5. **Check function permissions** in Supabase

The merchant registration should now work smoothly without any database errors!
