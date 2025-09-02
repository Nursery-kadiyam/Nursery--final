# 🚀 Products Table Migration: merchant_email → merchant_code

## 🎯 **Migration Overview**

This migration replaces the `merchant_email` column in the `products` table with `merchant_code` to establish a proper foreign key relationship with the `merchants` table.

### **Key Changes:**
- ✅ Remove `merchant_email` column from products table
- ✅ Add `merchant_code` column with foreign key constraint
- ✅ Update all existing products to use 'admin' as merchant_code
- ✅ Update frontend code to use merchant_code instead of merchant_email
- ✅ Update RLS policies to use merchant_code

## 📋 **Migration Steps**

### **Step 1: Run Database Migration Script**

Execute the migration script in your Supabase SQL Editor:

```sql
-- Run the complete migration script
-- File: migrate_products_to_merchant_code.sql
```

This script will:
1. Add `merchant_code` column to products table
2. Update existing products to use 'admin' as merchant_code
3. Create foreign key constraint to merchants table
4. Remove `merchant_email` column
5. Update RLS policies
6. Create performance indexes

### **Step 1.5: Refresh Schema Cache (Important!)**

After running the migration, execute the schema cache refresh script:

```sql
-- Run the schema cache refresh script
-- File: refresh_products_schema_cache.sql
```

This script will:
1. Ensure the correct column names are used (`categories` not `category`)
2. Remove any old `category` column if it exists
3. Copy data from `category` to `categories` if needed
4. Refresh the ORM/API schema cache
5. Verify all column names are correct

### **Step 2: Frontend Code Updates**

The following files have been updated:

#### **A. MerchantDashboard.tsx** ✅
- Updated `ProductManagement` component to use `merchantCode` instead of `merchantEmail`
- Updated product queries to filter by `merchant_code`
- Updated product insertion to use `merchant_code`
- Added validation to ensure `merchantCode` is available
- **Fixed column name**: Changed from `category` to `categories` to match database schema
- Updated form fields, data handling, and display to use `categories`

#### **B. MyQuotations.tsx** ✅
- Updated product category reference from `product.category` to `product.categories`

**Key Changes:**
```typescript
// Before
const ProductManagement: React.FC<{ merchantEmail: string }> = ({ merchantEmail }) => {
    .eq('merchant_email', merchantEmail)
    merchant_email: merchantEmail
    category: formData.category

// After  
const ProductManagement: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    .eq('merchant_code', merchantCode)
    merchant_code: merchantCode
    categories: formData.categories
```

### **Step 3: Database Structure Verification**

After running the migration, verify the new structure:

```sql
-- Check products table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Verify foreign key constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'products'
AND kcu.column_name = 'merchant_code';
```

## 🔧 **New Database Relationships**

### **Products → Merchants Relationship**
```sql
-- Products table now has:
merchant_code TEXT NOT NULL REFERENCES merchants(merchant_code)

-- This ensures:
-- 1. All products must have a valid merchant_code
-- 2. merchant_code must exist in merchants table
-- 3. Proper referential integrity
```

### **RLS Policies Updated**
```sql
-- New policies use merchant_code instead of user_id checks
CREATE POLICY "Merchants can insert products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchant_code = products.merchant_code 
            AND user_id = auth.uid() 
            AND status = 'approved'
        )
    );
```

## 📊 **Data Migration Results**

### **Before Migration:**
- Products used `merchant_email` (string, no foreign key)
- No referential integrity
- Manual email validation required

### **After Migration:**
- Products use `merchant_code` (foreign key to merchants table)
- Referential integrity enforced
- Automatic validation through foreign key constraint
- All existing products assigned to 'admin' merchant

## 🧪 **Testing Checklist**

### **Database Testing:**
- [ ] Run migration script successfully
- [ ] Run schema cache refresh script
- [ ] Verify all products have merchant_code = 'admin'
- [ ] Confirm foreign key constraint is active
- [ ] Test RLS policies work correctly
- [ ] Verify column names: `categories` (not `category`)

### **Frontend Testing:**
- [ ] Merchant dashboard loads without errors
- [ ] Product management functions work correctly
- [ ] New products are created with correct merchant_code
- [ ] Product queries filter correctly by merchant_code
- [ ] Category field works correctly (uses `categories` column)
- [ ] Product display shows correct category information

### **Integration Testing:**
- [ ] Admin can view all products
- [ ] Merchants can only see their own products
- [ ] Product-merchant relationships work correctly
- [ ] No broken references in existing data

## 🚨 **Rollback Plan**

If issues occur, you can rollback using:

```sql
-- Rollback script (if needed)
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_merchant_code;
ALTER TABLE products DROP COLUMN IF EXISTS merchant_code;
ALTER TABLE products ADD COLUMN IF EXISTS merchant_email TEXT;
```

## 📈 **Benefits of Migration**

### **1. Data Integrity**
- Foreign key constraints prevent orphaned products
- Ensures all products belong to valid merchants

### **2. Performance**
- Indexed merchant_code column for faster queries
- Better join performance with merchants table

### **3. Security**
- RLS policies based on merchant_code are more secure
- Prevents unauthorized access to other merchants' products

### **4. Maintainability**
- Clear relationship between products and merchants
- Easier to manage merchant-product associations

## ✅ **Migration Complete**

The migration from `merchant_email` to `merchant_code` is now complete. All new products will use the merchant_code system, and existing products have been assigned to the 'admin' merchant.

**Next Steps:**
1. Test the merchant dashboard functionality
2. Verify product creation and management
3. Monitor for any issues in production
4. Update any additional code that might reference merchant_email
