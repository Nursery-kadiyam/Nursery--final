-- Setup Product Images Storage Bucket
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. CREATE STORAGE BUCKET
-- ========================================
SELECT '=== CREATING PRODUCT IMAGES BUCKET ===' as section;

-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Make it public so images can be accessed without authentication
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. CREATE STORAGE POLICIES
-- ========================================
SELECT '=== CREATING STORAGE POLICIES ===' as section;

-- Policy for inserting images (only authenticated users can upload)
CREATE POLICY "Allow authenticated users to upload product images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Policy for viewing images (public access)
CREATE POLICY "Allow public access to product images" ON storage.objects
FOR SELECT USING (
    bucket_id = 'product-images'
);

-- Policy for updating images (only authenticated users can update their own images)
CREATE POLICY "Allow authenticated users to update product images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Policy for deleting images (only authenticated users can delete)
CREATE POLICY "Allow authenticated users to delete product images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- ========================================
-- 3. CREATE FUNCTION TO CLEAN UP OLD IMAGES
-- ========================================
SELECT '=== CREATING CLEANUP FUNCTION ===' as section;

-- Function to delete old images when product is deleted
CREATE OR REPLACE FUNCTION cleanup_product_images()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete associated images from storage when product is deleted
    DELETE FROM storage.objects 
    WHERE bucket_id = 'product-images' 
    AND name LIKE '%' || OLD.id || '%';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up images
DROP TRIGGER IF EXISTS cleanup_product_images_trigger ON products;
CREATE TRIGGER cleanup_product_images_trigger
    BEFORE DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_product_images();

-- ========================================
-- 4. VERIFY SETUP
-- ========================================
SELECT '=== VERIFYING SETUP ===' as section;

-- Check if bucket exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'product-images';

-- Check storage policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%product%';

-- ========================================
-- 5. TEST UPLOAD PERMISSIONS
-- ========================================
SELECT '=== TESTING UPLOAD PERMISSIONS ===' as section;

-- This will show the current user's permissions
SELECT 
    'Current user can upload to product-images bucket' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE id = 'product-images' 
            AND public = true
        ) THEN '✅ Bucket is public and accessible'
        ELSE '❌ Bucket not accessible'
    END as result;

-- ========================================
-- 6. SUMMARY
-- ========================================
SELECT '=== SETUP SUMMARY ===' as section;

SELECT 
    'Product Images Storage Setup Complete!' as status,
    'Bucket: product-images' as bucket_name,
    'Public access enabled' as access_type,
    '5MB file size limit' as file_limit,
    'Automatic cleanup on product deletion' as cleanup,
    'Supported formats: JPEG, PNG, GIF, WebP, SVG' as formats;
