-- CHECK ENUM VALUES FOR ROLE COLUMN
-- This script checks what ENUM values are available for the role column

-- 1. Check the ENUM type definition
SELECT '=== ENUM TYPE DEFINITION ===' as status;
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'role'
    AND table_schema = 'public'
)
ORDER BY e.enumsortorder;

-- 2. Check current role values in the table
SELECT '=== CURRENT ROLE VALUES ===' as status;
SELECT 
    role,
    COUNT(*) as count
FROM user_profiles 
GROUP BY role
ORDER BY role;

-- 3. Show all users with their roles
SELECT '=== ALL USERS WITH ROLES ===' as status;
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 4. Check for any invalid role values
SELECT '=== CHECKING FOR INVALID ROLES ===' as status;
SELECT 
    id,
    email,
    role
FROM user_profiles 
WHERE role IS NULL OR role = '';
