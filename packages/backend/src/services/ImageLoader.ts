import fs from 'fs/promises';
import { isImageFile } from '../utils/isImageFile';
import { loadAndPrepareImage } from '@workspace/shared';

export interface ImageLoadOptions {
  downsampleFactor?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageData {
  imageData: string;  // base64 data URL
  width: number;      // actual width of the returned image
  height: number;     // actual height of the returned image
  originalWidth: number;  // original image width before scaling
  originalHeight: number; // original image height before scaling
}

export class ImageLoader {
  async loadAsBase64(imagePath: string, options?: ImageLoadOptions): Promise<ImageData> {
    try {
      console.log('[ImageLoader] Loading image:', imagePath);
      
      // Validate file
      await this.validateImageFile(imagePath);
      
      // Calculate downsample factor
      const downsampleFactor = await this.calculateDownsampleFactor(imagePath, options);
      
      // Load and prepare the image
      const { original, scaled } = await loadAndPrepareImage(imagePath, downsampleFactor);
      
      // Convert to base64 data URL
      const base64 = scaled.toDataURL();
      
      console.log('[ImageLoader] Image loaded successfully, dimensions:', scaled.width, 'x', scaled.height);
      
      return {
        imageData: base64,
        width: scaled.width,
        height: scaled.height,
        originalWidth: original.width,
        originalHeight: original.height
      };
    } catch (error) {
      console.error('[ImageLoader] Error loading image:', error);
      throw error;
    }
  }

  private async validateImageFile(imagePath: string): Promise<void> {
    const stats = await fs.stat(imagePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
    
    if (!isImageFile(imagePath)) {
      throw new Error('File is not a supported image format');
    }
  }

  private async calculateDownsampleFactor(
    imagePath: string, 
    options?: ImageLoadOptions
  ): Promise<number> {
    let downsampleFactor = options?.downsampleFactor || 1.0;
    
    // If max dimensions are specified, calculate downsample factor
    if (options?.maxWidth || options?.maxHeight) {
      // Load just to get dimensions first
      const { original } = await loadAndPrepareImage(imagePath, 1.0);
      
      const widthRatio = options.maxWidth ? original.width / options.maxWidth : 1;
      const heightRatio = options.maxHeight ? original.height / options.maxHeight : 1;
      const maxRatio = Math.max(widthRatio, heightRatio);
      
      if (maxRatio > 1) {
        downsampleFactor = 1 / maxRatio;
        console.log(
          `[ImageLoader] Image dimensions ${original.width}x${original.height} exceed max, ` +
          `downsampling by ${downsampleFactor.toFixed(2)}`
        );
      }
    }
    
    return downsampleFactor;
  }
} 