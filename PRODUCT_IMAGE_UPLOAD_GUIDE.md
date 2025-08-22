# Product Image Upload Feature Guide

## Overview
This feature allows merchants to upload product images directly to Supabase Storage and automatically save the image URLs to the products table. The implementation includes drag-and-drop support, image preview, and automatic cleanup.

## Features Implemented

### ✅ **Core Functionality**
- **File Input**: Users can select images from their device
- **Unique Filenames**: Generated using product ID and timestamp
- **Supabase Storage Upload**: Images stored in `product-images` bucket
- **Public URL Generation**: Automatic public URL creation
- **Database Integration**: Image URLs saved to `products.image_url` column
- **Image Preview**: Immediate preview after upload
- **Image Replacement**: Option to replace existing images
- **Error Handling**: Clear success/error messages

### ✅ **Advanced Features**
- **Drag & Drop Support**: Users can drag images onto the upload area
- **File Validation**: Type and size validation (max 5MB)
- **Loading States**: Visual feedback during upload
- **Image Removal**: Option to remove uploaded images
- **Automatic Cleanup**: Old images deleted when products are removed
- **Responsive Design**: Works on all device sizes

## Implementation Details

### 1. **ImageUpload Component** (`src/components/ui/ImageUpload.tsx`)

#### **Key Features:**
```typescript
interface ImageUploadProps {
  currentImageUrl?: string;        // Existing image URL
  onImageUpload: (imageUrl: string) => void;  // Callback for new image
  onImageRemove?: () => void;      // Callback for image removal
  productId?: string;              // Product ID for filename generation
  className?: string;              // Custom styling
}
```

#### **File Upload Process:**
1. **File Selection**: User selects image file
2. **Validation**: Check file type and size
3. **Preview**: Create local preview using FileReader
4. **Upload**: Send to Supabase Storage
5. **URL Generation**: Get public URL from storage
6. **Callback**: Pass URL back to parent component

#### **Filename Generation:**
```typescript
const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const productIdSuffix = productId ? `-${productId}` : '';
  const extension = originalName.split('.').pop();
  return `product-image-${timestamp}${productIdSuffix}.${extension}`;
};
```

### 2. **Storage Configuration** (`setup_product_images_storage.sql`)

#### **Bucket Setup:**
- **Name**: `product-images`
- **Public Access**: Enabled for easy image viewing
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WebP, SVG

#### **Storage Policies:**
- **Upload**: Authenticated users only
- **View**: Public access
- **Update**: Authenticated users only
- **Delete**: Authenticated users only

#### **Automatic Cleanup:**
```sql
CREATE OR REPLACE FUNCTION cleanup_product_images()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'product-images' 
    AND name LIKE '%' || OLD.id || '%';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

### 3. **Merchant Dashboard Integration**

#### **Form Integration:**
```typescript
<ImageUpload
  currentImageUrl={formData.image_url}
  onImageUpload={(imageUrl) => setFormData({...formData, image_url: imageUrl})}
  onImageRemove={() => setFormData({...formData, image_url: ''})}
  productId={editingProduct?.id}
/>
```

#### **Database Operations:**
- **Insert**: Include `image_url` in product creation
- **Update**: Update `image_url` when editing products
- **Delete**: Automatic cleanup via database trigger

## Usage Instructions

### **For Merchants:**

#### **Adding a New Product:**
1. Click "Add New Product" button
2. Fill in product details
3. **Upload Image**: Click the upload area or drag an image
4. Select an image file (JPEG, PNG, GIF, WebP, SVG)
5. Wait for upload to complete
6. See preview of uploaded image
7. Submit the form

#### **Editing an Existing Product:**
1. Click "Edit" on any product card
2. **Replace Image**: Click the upload area to replace existing image
3. **Remove Image**: Click the X button to remove current image
4. Save changes

#### **Image Requirements:**
- **Format**: JPEG, PNG, GIF, WebP, SVG
- **Size**: Maximum 5MB
- **Resolution**: Recommended 800x600 pixels or larger
- **Quality**: High-quality images recommended

### **For Developers:**

#### **Setup Steps:**
1. **Run Storage Setup**: Execute `setup_product_images_storage.sql` in Supabase
2. **Import Component**: Add ImageUpload to your component
3. **Configure Props**: Set up callbacks for image handling
4. **Test Upload**: Verify upload functionality

#### **Customization:**
```typescript
// Custom file size limit
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Custom allowed types
const allowedTypes = ['image/jpeg', 'image/png'];

// Custom bucket name
const bucketName = 'custom-images';
```

## Error Handling

### **Common Errors:**
- **Invalid File Type**: Only image files allowed
- **File Too Large**: Maximum 5MB limit
- **Upload Failed**: Network or storage issues
- **Permission Denied**: User not authenticated

### **Error Messages:**
- ✅ **Success**: "Upload successful ✅"
- ❌ **Failure**: "Upload failed ❌"
- ⚠️ **Validation**: "File too large" / "Invalid file type"

## Security Considerations

### **File Validation:**
- **Type Checking**: Only image MIME types allowed
- **Size Limits**: Prevents large file uploads
- **Extension Validation**: Safe file extensions only

### **Access Control:**
- **Authentication Required**: Only logged-in users can upload
- **Public Viewing**: Images are publicly accessible
- **Automatic Cleanup**: Orphaned files removed

### **Storage Security:**
- **Unique Filenames**: Prevents filename conflicts
- **Product Association**: Files linked to specific products
- **Cleanup Triggers**: Automatic deletion on product removal

## Performance Optimizations

### **Upload Optimizations:**
- **File Size Limits**: Prevents large uploads
- **Image Compression**: Browser handles compression
- **Progress Feedback**: Loading states for user experience

### **Display Optimizations:**
- **Lazy Loading**: Images load as needed
- **Error Fallbacks**: Placeholder images for failed loads
- **Responsive Images**: Different sizes for different devices

## Testing

### **Manual Testing:**
1. **Upload Test**: Try uploading different image types
2. **Size Test**: Test files near the 5MB limit
3. **Replace Test**: Upload new image to replace existing
4. **Remove Test**: Remove image and verify cleanup
5. **Error Test**: Try uploading invalid files

### **Automated Testing:**
```typescript
// Test file validation
test('should reject non-image files', () => {
  const file = new File(['text'], 'test.txt', { type: 'text/plain' });
  // Test validation logic
});

// Test upload process
test('should upload image successfully', async () => {
  const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
  // Test upload process
});
```

## Troubleshooting

### **Common Issues:**

#### **Upload Fails:**
- Check Supabase Storage bucket exists
- Verify storage policies are correct
- Check user authentication status
- Review browser console for errors

#### **Images Not Displaying:**
- Verify public URL generation
- Check bucket public access setting
- Review image URL in database
- Test direct URL access

#### **Permission Errors:**
- Ensure user is authenticated
- Check storage policies
- Verify bucket configuration
- Review user permissions

### **Debug Steps:**
1. **Check Console**: Look for JavaScript errors
2. **Verify Storage**: Check Supabase Storage dashboard
3. **Test Permissions**: Verify user can access bucket
4. **Check Database**: Verify image_url is saved correctly

## Future Enhancements

### **Potential Improvements:**
- **Image Cropping**: Allow users to crop images
- **Multiple Images**: Support for multiple product images
- **Image Optimization**: Automatic compression and resizing
- **CDN Integration**: Faster image delivery
- **Watermarking**: Add watermarks to images
- **Bulk Upload**: Upload multiple images at once

### **Advanced Features:**
- **Image Analytics**: Track image views and downloads
- **A/B Testing**: Test different product images
- **AI Tagging**: Automatic image tagging
- **OCR Integration**: Extract text from images

This implementation provides a robust, user-friendly image upload system that integrates seamlessly with the existing merchant dashboard and product management workflow.
