# Update User Roles Guide

## 🎯 **What This Does**
- ✅ **Updates all existing users** to have 'user' role
- ✅ **Sets default role to 'user'** for new signups
- ✅ **Ensures data consistency** across the application

## 🛠️ **Step-by-Step Instructions**

### **Step 1: Update Existing Users**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the contents of `update_existing_user_roles.sql`
4. Click **Run**

This script will:
- Show current role distribution
- Update all existing users to 'user' role
- Set default role to 'user' for future signups
- Add data constraints for role validation
- Test the changes

### **Step 2: Make Specific Users Admin (if needed)**
If you need to make specific users admin:

1. Copy the contents of `make_user_admin.sql`
2. Replace `'admin@example.com'` with the actual admin email
3. Run the script

### **Step 3: Verify the Changes**
After running the scripts, you should see:
- ✅ All users have 'user' role
- ✅ Default role is set to 'user'
- ✅ Only explicitly set admin users have 'admin' role

## 🔍 **What the Script Does**

### **Before Running:**
```
Role Distribution:
- admin: 5 users
- user: 10 users
- null: 3 users
```

### **After Running:**
```
Role Distribution:
- user: 18 users (all existing users)
- admin: 0 users (until you make someone admin)
```

## 📝 **Database Commands**

### **Check Current Roles:**
```sql
SELECT email, role, created_at 
FROM user_profiles 
ORDER BY created_at DESC;
```

### **Make User Admin:**
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### **Make User Merchant:**
```sql
UPDATE user_profiles 
SET role = 'merchant' 
WHERE email = 'merchant@example.com';
```

### **Check Role Distribution:**
```sql
SELECT role, COUNT(*) as user_count
FROM user_profiles 
GROUP BY role
ORDER BY role;
```

## 🧪 **Testing**

### **Test 1: New User Signup**
1. Register a new user
2. Check database - role should be 'user'
3. Login - should redirect to home page

### **Test 2: Admin User**
1. Make a user admin using the script
2. Login with admin email
3. Should redirect to admin dashboard

### **Test 3: Existing Users**
1. Login with existing user
2. Should redirect to home page (not admin dashboard)

## 🎉 **Expected Results**

After running the scripts:
- ✅ **All existing users** have 'user' role
- ✅ **New signups** automatically get 'user' role
- ✅ **Admin users** must be explicitly set up
- ✅ **Better security** - no accidental admin access
- ✅ **Consistent behavior** across all users

## ⚠️ **Important Notes**

1. **Backup First**: Consider backing up your data before running the update
2. **Admin Access**: You'll need to manually set admin users after the update
3. **Testing**: Test with a few users before applying to production
4. **Rollback**: If needed, you can restore from backup

## 🚀 **Quick Commands**

### **Run the main update:**
```sql
-- Copy and paste update_existing_user_roles.sql
```

### **Make someone admin:**
```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### **Check results:**
```sql
SELECT role, COUNT(*) FROM user_profiles GROUP BY role;
```

The user roles are now properly updated! 🎯




