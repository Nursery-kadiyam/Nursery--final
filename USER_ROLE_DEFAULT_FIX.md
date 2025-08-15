# User Role Default Fix Guide

## 🎯 **Problem Solved**
- **Before**: New users were getting 'admin' role by default
- **After**: New users now get 'user' role by default (as requested)

## 🔧 **What Was Changed**

### 1. **Database Changes**
- ✅ **Set default role to 'user'** in `user_profiles` table
- ✅ **Updated existing records** to have 'user' role (except admin users)
- ✅ **Added constraint** to ensure role is one of: 'user', 'admin', 'merchant'
- ✅ **Created SQL script** (`fix_user_role_default.sql`) for easy setup

### 2. **Code Changes**
- ✅ **Updated login popup** to create profiles with 'user' role by default
- ✅ **Updated Google OAuth** to create profiles with 'user' role by default
- ✅ **Updated AuthContext** to use 'user' as default role
- ✅ **Fixed redirect logic** to send new users to home page

### 3. **Role Management**
- ✅ **New users** → Get 'user' role automatically
- ✅ **Admin users** → Must be explicitly set to 'admin' role
- ✅ **Merchant users** → Must be explicitly set to 'merchant' role

## 🛠️ **How to Apply the Fix**

### **Step 1: Run the SQL Script**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the contents of `fix_user_role_default.sql`
4. Click **Run**

### **Step 2: Verify the Changes**
The script will show you:
- ✅ Current table structure
- ✅ Role distribution across users
- ✅ All users with their roles
- ✅ Test results

### **Step 3: Test the Fix**
1. **Register a new user** (should get 'user' role)
2. **Login with new user** (should redirect to home)
3. **Check database** to confirm role is 'user'

## 🔍 **How It Works Now**

### **New User Registration:**
1. **User registers** → Supabase creates auth account
2. **Profile creation** → Gets 'user' role by default
3. **Login redirect** → Goes to `/home` (user dashboard)

### **Admin User Setup:**
1. **Admin registers** → Gets 'user' role initially
2. **Manual update** → Change role to 'admin' in database
3. **Next login** → Redirects to `/admin-dashboard`

### **Role Hierarchy:**
- **'user'** → Regular users, access to home page
- **'admin'** → Admin users, access to admin dashboard
- **'merchant'** → Merchant users, access to merchant dashboard

## 🧪 **Testing Checklist**

### **Test 1: New User Registration**
- [ ] Register new user with regular email
- [ ] Check database - role should be 'user'
- [ ] Login - should redirect to `/home`
- [ ] Verify user dashboard loads

### **Test 2: Admin User Setup**
- [ ] Register user with admin email
- [ ] Update role to 'admin' in database
- [ ] Login - should redirect to `/admin-dashboard`
- [ ] Verify admin dashboard loads

### **Test 3: Google OAuth**
- [ ] Login with Google using new account
- [ ] Check database - role should be 'user'
- [ ] Verify redirect to `/home`

## 📝 **Database Commands**

### **Make User Admin:**
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### **Make User Merchant:**
```sql
UPDATE user_profiles 
SET role = 'merchant' 
WHERE email = 'merchant@example.com';
```

### **Check User Roles:**
```sql
SELECT email, role, created_at 
FROM user_profiles 
ORDER BY created_at DESC;
```

## 🎉 **Result**

After applying this fix:
- ✅ **New users** get 'user' role by default
- ✅ **Admin users** must be explicitly set up
- ✅ **Better security** - no accidental admin access
- ✅ **Clear role management** - easy to understand and maintain
- ✅ **Consistent behavior** across all registration methods

The user role default is now properly set to 'user' as requested! 🚀
