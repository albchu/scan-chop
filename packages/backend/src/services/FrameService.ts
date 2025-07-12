import { FrameData, Vector2, ProcessingConfig, BoundingBox, generatePageId } from '@workspace/shared';
import { findBoundingBoxFromSeed, scaleBoundingBox, smartCrop } from '@workspace/shared';
import type { Image } from 'image-js';

// Internal metadata for regenerating frame images
interface FrameMetadata {
  imagePath: string;
  pageId: string;
  scaleFactor: number;
}

export class FrameService {
  private frames = new Map<string, FrameData>();
  private frameMetadata = new Map<string, FrameMetadata>();
  private frameCounter = 1;

  constructor() {
    console.log('[FrameService] Initialized');
  }

  getAllFrames(): FrameData[] {
    return Array.from(this.frames.values());
  }

  getFrame(id: string): FrameData | undefined {
    return this.frames.get(id);
  }

  getFrameMetadata(id: string): FrameMetadata | undefined {
    return this.frameMetadata.get(id);
  }

  async generateFrameFromSeed(
    original: Image,        // Full resolution image for final cropping
    scaled: Image,          // Scaled image for bounding box detection
    scaleFactor: number,    // Scale factor (scaled width / original width)
    seed: Vector2,
    imagePath: string,      // Path to the original image
    config?: ProcessingConfig
  ): Promise<FrameData> {
    // Find bounding box on the scaled image for performance
    const { boundingBox: scaledBoundingBox } = findBoundingBoxFromSeed(scaled, seed, {
      ...config,
      downsampleFactor: scaleFactor
    });
    
    // Scale the bounding box back to original image dimensions
    const originalBoundingBox = scaleBoundingBox(
      scaledBoundingBox, 
      1 / scaleFactor  // Inverse of scale factor to go from scaled -> original
    );
    
    console.log(
      `[FrameService] Bounding box - Scaled: ${scaledBoundingBox.width.toFixed(0)}×${scaledBoundingBox.height.toFixed(0)}, ` +
      `Original: ${originalBoundingBox.width.toFixed(0)}×${originalBoundingBox.height.toFixed(0)}`
    );
    
    // Perform the smart crop on the original full-resolution image
    // This gives us the best quality output
    const croppedImage = smartCrop(original, originalBoundingBox, config);
    
    // Generate base64 data URL for the cropped image
    let imageData: string | undefined;
    try {
      imageData = croppedImage.toDataURL();
      console.log(`[FrameService] ImageData generated successfully, length: ${imageData.length}`);
    } catch (error) {
      console.error(`[FrameService] Failed to generate imageData:`, error);
      imageData = undefined;
    }
    
    console.log(`[FrameService] Cropped image: ${croppedImage.width}×${croppedImage.height}`);
    
    // Generate pageId from imagePath
    const pageId = generatePageId(imagePath);
    
    // Create FrameData with display coordinates (scaled bounding box)
    // The UI works in display space, not original image space
    const frameData: FrameData = {
      id: `${pageId}-frame-${this.frameCounter}`,
      label: `Frame ${this.frameCounter}`,
      x: scaledBoundingBox.x,
      y: scaledBoundingBox.y,
      width: scaledBoundingBox.width,
      height: scaledBoundingBox.height,
      rotation: scaledBoundingBox.rotation,
      orientation: 0,
      imageData, // Include the cropped image data
      imageScaleFactor: 1 / scaleFactor, // Store inverse scale factor (display to original)
      pageId // Include pageId
    };
    
    console.log(`[FrameService] FrameData includes imageData: ${!!frameData.imageData}`);
    console.log(`[FrameService] FrameData includes pageId: ${frameData.pageId}`);
    
    // Store metadata for regeneration
    const metadata: FrameMetadata = {
      imagePath,
      pageId,
      scaleFactor
    };
    
    // TODO: Future persistence - save frame to SQLite with pageId
    // await db.frames.insert({ ...frameData, pageId });
    
    // Increment counter for next frame
    this.frameCounter++;
    
    // Persist frame and metadata
    this.frames.set(frameData.id, frameData);
    this.frameMetadata.set(frameData.id, metadata);
    
    console.log(`[FrameService] Generated and persisted frame: ${frameData.id}`);
    return frameData;
  }

  async updateFrame(
    id: string, 
    updates: Partial<FrameData>,
    original?: Image,      // Optional: provide for regenerating imageData
    config?: ProcessingConfig
  ): Promise<FrameData | undefined> {
    const frame = this.frames.get(id);
    const metadata = this.frameMetadata.get(id);
    
    if (!frame) {
      return undefined;
    }
    
    const updatedFrame = { ...frame, ...updates };
    
    console.log(`[FrameService] Updating frame ${id}, original has imageData: ${!!frame.imageData}`);
    console.log(`[FrameService] Updated frame will have imageData: ${!!updatedFrame.imageData}`);
    
    // If coordinates changed and we have the original image, regenerate the cropped image
    if (original && metadata && (
      updates.x !== undefined || 
      updates.y !== undefined || 
      updates.width !== undefined || 
      updates.height !== undefined || 
      updates.rotation !== undefined
    )) {
      // Scale the bounding box back to original image dimensions
      const originalBoundingBox = scaleBoundingBox(
        {
          x: updatedFrame.x,
          y: updatedFrame.y,
          width: updatedFrame.width,
          height: updatedFrame.height,
          rotation: updatedFrame.rotation
        }, 
        1 / metadata.scaleFactor
      );
      
      // Generate new cropped image
      const croppedImage = smartCrop(original, originalBoundingBox, config);
      updatedFrame.imageData = croppedImage.toDataURL();
      
      console.log(`[FrameService] Regenerated cropped image for frame: ${id}`);
    }
    
    this.frames.set(id, updatedFrame);
    
    // TODO: Future persistence - update frame in SQLite
    // await db.frames.update(id, updatedFrame);
    
    console.log(`[FrameService] Updated frame: ${id}`);
    return updatedFrame;
  }

  deleteFrame(id: string): boolean {
    const deleted = this.frames.delete(id);
    if (deleted) {
      this.frameMetadata.delete(id);
      console.log(`[FrameService] Deleted frame: ${id}`);
    }
    return deleted;
  }

  clearAllFrames(): void {
    this.frames.clear();
    this.frameMetadata.clear();
    this.frameCounter = 1;
    console.log('[FrameService] Cleared all frames');
  }
} 