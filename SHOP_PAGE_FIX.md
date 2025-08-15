# Shop Page Products Not Showing - Complete Fix Guide

## Problem
Products are not displaying on the shop page despite having data in the database.

## Root Causes & Solutions

### 1. Database Issues

#### A. Check if products table exists and has data
Run this in your Supabase SQL Editor:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'products';

-- Check if data exists
SELECT COUNT(*) FROM products;
```

#### B. Fix products table structure
Run the complete fix script: `fix_products_table.sql`

This script will:
- Create the products table if it doesn't exist
- Add all required columns
- Disable RLS temporarily
- Grant proper permissions
- Insert sample products
- Create performance indexes

### 2. Row Level Security (RLS) Issues

#### A. Check RLS status
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables WHERE tablename = 'products';
```

#### B. Disable RLS temporarily
```sql
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
```

#### C. Grant permissions
```sql
GRANT ALL ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;
```

### 3. Frontend Code Issues

#### A. Fixed useEffect structure
The useEffect in Shop.tsx had formatting issues. Fixed:
- Proper error handling
- Loading state management
- Better console logging

#### B. Added loading state
- Shows loading spinner while fetching products
- Better user experience

#### C. Added debug information
- Shows debug info in development mode
- Helps identify issues

### 4. Testing Steps

#### Step 1: Run the test HTML file
Open `test_products_fetch.html` in your browser to test database connection.

#### Step 2: Check browser console
Open browser dev tools and check for:
- Network errors
- JavaScript errors
- Console logs from the fetch function

#### Step 3: Verify database connection
Run the diagnostic script: `check_products_table.sql`

### 5. Quick Fix Commands

#### A. If you need to reset everything:
```sql
-- Run this in Supabase SQL Editor
\i fix_products_table.sql
```

#### B. If you just need to check data:
```sql
-- Run this in Supabase SQL Editor
\i check_products_table.sql
```

### 6. Common Issues & Solutions

#### Issue 1: "No products found" message
**Cause**: Database connection issue or no data
**Solution**: Run the fix script and check network tab

#### Issue 2: Loading spinner never stops
**Cause**: Fetch function error
**Solution**: Check browser console for errors

#### Issue 3: Products show but images don't load
**Cause**: Image paths incorrect
**Solution**: Check if image files exist in `/public/assets/`

#### Issue 4: Filtering not working
**Cause**: Category mismatch between frontend and database
**Solution**: Check category values in database vs frontend

### 7. Verification Checklist

- [ ] Products table exists in database
- [ ] Products table has data (run `SELECT COUNT(*) FROM products;`)
- [ ] RLS is disabled or has proper policies
- [ ] Permissions are granted correctly
- [ ] Frontend can connect to Supabase
- [ ] No JavaScript errors in console
- [ ] Network requests succeed
- [ ] Images load correctly

### 8. Debug Information

The updated Shop component now shows debug information in development mode:
- Total plants count
- Loading state
- Selected category
- Any fetch errors

### 9. Next Steps

1. Run the `fix_products_table.sql` script in Supabase
2. Restart your development server
3. Clear browser cache
4. Check the shop page
5. If still not working, check browser console and network tab

### 10. Support

If the issue persists after following these steps:
1. Check the browser console for specific errors
2. Verify Supabase connection settings
3. Test with the HTML test file
4. Check if other pages can access the database

## Files Modified

1. `src/pages/Shop.tsx` - Fixed useEffect and added loading state
2. `fix_products_table.sql` - Complete database setup script
3. `check_products_table.sql` - Diagnostic script
4. `test_products_fetch.html` - Test file for database connection
5. `SHOP_PAGE_FIX.md` - This guide
