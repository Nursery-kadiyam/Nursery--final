# Product Image Mapping Fix Guide

## Problem Description
When users opened product pages, the main image and review images were showing generic images (like Ashoka tree images) for all products instead of showing product-specific images. For example, when viewing a Ganuga tree product, it would display Ashoka tree images instead of Ganuga tree images.

## Root Cause
The `ProductDetails.tsx` component had hardcoded review images that were not linked to specific products. All products were showing the same set of images regardless of the actual product being viewed.

## Solution Implemented

### 1. Frontend Fix (ProductDetails.tsx)

#### A. Dynamic Image Mapping Function
Created a `getProductImages()` function that maps product names and categories to specific image sets:

```typescript
const getProductImages = (productName: string, productCategory: string) => {
    const productNameLower = productName.toLowerCase();
    
    // Ganuga tree specific images
    if (productNameLower.includes('ganuga') || productNameLower.includes('pongamia')) {
        return [
            { src: "/assets/ganuga.jpeg", alt: "Ganuga Tree - Main View" },
            { src: "/assets/ganuga1.jpeg", alt: "Ganuga Tree - Close Up" },
            // ... more Ganuga-specific images
        ];
    }
    
    // Similar mappings for other products...
};
```

#### B. Dynamic State Management
- Replaced hardcoded `reviewImages` state with dynamic state
- Images are now loaded based on the actual product being viewed
- Main image is set to the product's `image_url` from the database

#### C. Product-Specific Image Sets
Mapped specific images for:
- **Ganuga Tree**: ganuga.jpeg, ganuga1.jpeg, and related WhatsApp images
- **Ashoka Tree**: Ashoka.jpeg and related flowering images
- **Bamboo Plants**: Bamboo plants.jpeg, golden bamboo.jpeg, and grove images
- **Cassia Tree**: Cassia Tree.jpeg and yellow bloom images
- **Croton Plant**: Croton plant.jpeg and colorful leaf images
- **Balaji Nimma**: Balaji nimma.jpeg, Balaji nimma1.jpeg, and growth stage images
- **Boston Fern**: Boston Fern.jpeg and indoor display images

### 2. Database Enhancement (product_image_mapping_fix.sql)

#### A. New Database Columns
Added to the `products` table:
- `image_gallery`: JSONB column storing structured image data
- `additional_image_urls`: TEXT array for multiple image URLs

#### B. Product Image Mappings
Updated existing products with proper image mappings:
- Each product now has its own set of related images
- Images are categorized by product name and type
- Fallback to generic images for unmapped products

#### C. Performance Optimization
- Created indexes for faster image gallery queries
- Added GIN index for JSONB image_gallery column
- Created separate `product_images` table for better organization

## Implementation Steps

### Step 1: Run the Database Script
Execute `product_image_mapping_fix.sql` in your Supabase SQL Editor:

```sql
-- This will:
-- 1. Add new columns to products table
-- 2. Update existing products with proper image mappings
-- 3. Create performance indexes
-- 4. Verify the updates
```

### Step 2: Update Frontend Code
The `ProductDetails.tsx` file has been updated with:
- Dynamic image mapping function
- Product-specific image loading
- Proper state management for images

### Step 3: Test the Implementation
1. Open different product pages
2. Verify that each product shows its own specific images
3. Check that the image gallery displays correct thumbnails
4. Test the image modal/lightbox functionality

## Expected Results

### Before Fix:
- All products showed the same Ashoka tree images
- No product-specific image mapping
- Generic image display for all products

### After Fix:
- **Ganuga Tree**: Shows ganuga.jpeg, ganuga1.jpeg, and related images
- **Ashoka Tree**: Shows Ashoka.jpeg and flowering images
- **Bamboo Plants**: Shows bamboo varieties and grove images
- **Cassia Tree**: Shows yellow bloom and avenue planting images
- **Croton Plant**: Shows colorful leaf and indoor display images
- **Balaji Nimma**: Shows growth stage and mature plant images
- **Boston Fern**: Shows indoor display and hanging basket images

## Benefits

1. **Product Accuracy**: Each product now displays its own correct images
2. **Better User Experience**: Users see relevant images for the product they're viewing
3. **Professional Appearance**: Product pages look more professional with accurate imagery
4. **Scalable Solution**: Easy to add new products and their image mappings
5. **Performance Optimized**: Database indexes ensure fast image loading

## Maintenance

### Adding New Products
To add images for new products:

1. **Frontend**: Add new conditions to `getProductImages()` function
2. **Database**: Update the `image_gallery` column for the new product
3. **Assets**: Ensure all referenced images exist in `/public/assets/`

### Example for New Product:
```typescript
// In getProductImages function
if (productNameLower.includes('new-plant')) {
    return [
        { src: "/assets/new-plant.jpeg", alt: "New Plant - Main View" },
        { src: "/assets/new-plant-close.jpeg", alt: "New Plant - Close Up" },
        // ... more images
    ];
}
```

## Troubleshooting

### Common Issues:

1. **Images Not Loading**: Check if image paths exist in `/public/assets/`
2. **Wrong Images Showing**: Verify product name matching in `getProductImages()`
3. **Database Errors**: Ensure the SQL script ran successfully
4. **Performance Issues**: Check if database indexes were created

### Debug Steps:
1. Check browser console for image loading errors
2. Verify product names in database match the mapping conditions
3. Test image URLs directly in browser
4. Check database for proper image_gallery data

## Files Modified

1. **`src/pages/ProductDetails.tsx`**: Main component with dynamic image mapping
2. **`product_image_mapping_fix.sql`**: Database update script
3. **`PRODUCT_IMAGE_MAPPING_FIX_GUIDE.md`**: This documentation

## Verification Checklist

- [ ] Database script executed successfully
- [ ] ProductDetails.tsx updated with dynamic image mapping
- [ ] Ganuga tree shows ganuga-specific images
- [ ] Ashoka tree shows ashoka-specific images
- [ ] Bamboo plants show bamboo-specific images
- [ ] All other products show appropriate images
- [ ] Image gallery thumbnails work correctly
- [ ] Image modal/lightbox functions properly
- [ ] No console errors related to image loading
- [ ] Performance is acceptable (images load quickly)

This fix ensures that each product displays its own correct images, providing users with accurate visual information about the specific plant they're viewing.
