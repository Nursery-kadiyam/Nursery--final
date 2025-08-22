import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Label } from './label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  onImageRemove?: () => void;
  productId?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  onImageRemove,
  productId,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Generate unique filename
  const generateFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const productIdSuffix = productId ? `-${productId}` : '';
    const extension = originalName.split('.').pop();
    return `product-image-${timestamp}${productIdSuffix}.${extension}`;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadImage(file);
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file: File) => {
    setIsUploading(true);
    
    try {
      const fileName = generateFileName(file.name);
      const bucketName = 'product-images';

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Call the callback with the new image URL
      onImageUpload(publicUrl);

      toast({
        title: "Upload successful ✅",
        description: "Image uploaded successfully!",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Reset preview on error
      setPreviewUrl(currentImageUrl || null);
      
      toast({
        title: "Upload failed ❌",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
    
    toast({
      title: "Image removed",
      description: "Image has been removed from the product",
      variant: "default"
    });
  };

  // Handle click on upload area
  const handleUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label className="text-sm font-medium">Product Image</Label>
      
      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Area */}
      <div className="space-y-3">
        {/* Image Preview */}
        {previewUrl && (
          <div className="relative group">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
              <img
                src={previewUrl}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/assets/placeholder.svg';
                }}
              />
            </div>
            
            {/* Remove button overlay */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload Button */}
        <div
          onClick={handleUploadClick}
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer
            transition-colors hover:border-blue-400 hover:bg-blue-50
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            ${previewUrl ? 'border-blue-400 bg-blue-50' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Uploading image...</p>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon className="w-8 h-8 text-blue-600" />
              <p className="text-sm font-medium text-blue-600">Click to replace image</p>
              <p className="text-xs text-gray-500">or drag and drop a new image</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Click to upload image</p>
              <p className="text-xs text-gray-500">or drag and drop</p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
        </div>

        {/* Drag and Drop Support */}
        <div
          className="hidden"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('hidden');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('hidden');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('hidden');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              const file = files[0];
              if (file.type.startsWith('image/')) {
                const event = { target: { files: [file] } } as any;
                handleFileSelect(event);
              }
            }
          }}
        >
          <div className="border-2 border-blue-400 bg-blue-50 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-blue-600">Drop image here</p>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Upload a high-quality image of your product. Recommended size: 800x600 pixels or larger.
      </p>
    </div>
  );
};

export default ImageUpload;
