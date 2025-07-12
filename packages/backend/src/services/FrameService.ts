import { FrameData, Vector2, ProcessingConfig, BoundingBox } from '@workspace/shared';
import { findBoundingBoxFromSeed, scaleBoundingBox, smartCrop } from '@workspace/shared';
import type { Image } from 'image-js';

export class FrameService {
  private frames = new Map<string, FrameData>();
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

  async generateFrameFromSeed(
    original: Image,        // Full resolution image for final cropping
    scaled: Image,          // Scaled image for bounding box detection
    scaleFactor: number,    // Scale factor (scaled width / original width)
    seed: Vector2,
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
    
    // Store the cropped image data if needed (for future export functionality)
    // For now, we just log the dimensions
    console.log(`[FrameService] Cropped image: ${croppedImage.width}×${croppedImage.height}`);
    
    // Create FrameData with display coordinates (scaled bounding box)
    // The UI works in display space, not original image space
    const frameData: FrameData = {
      id: `frame-${this.frameCounter}`,
      label: `Frame ${this.frameCounter}`,
      x: scaledBoundingBox.x,
      y: scaledBoundingBox.y,
      width: scaledBoundingBox.width,
      height: scaledBoundingBox.height,
      rotation: scaledBoundingBox.rotation,
      orientation: 0
    };
    
    // Increment counter for next frame
    this.frameCounter++;
    
    // Persist in backend
    this.frames.set(frameData.id, frameData);
    
    console.log(`[FrameService] Generated and persisted frame: ${frameData.id}`);
    return frameData;
  }

  updateFrame(id: string, updates: Partial<FrameData>): FrameData | undefined {
    const frame = this.frames.get(id);
    if (!frame) {
      return undefined;
    }
    
    const updatedFrame = { ...frame, ...updates };
    this.frames.set(id, updatedFrame);
    
    console.log(`[FrameService] Updated frame: ${id}`);
    return updatedFrame;
  }

  deleteFrame(id: string): boolean {
    const deleted = this.frames.delete(id);
    if (deleted) {
      console.log(`[FrameService] Deleted frame: ${id}`);
    }
    return deleted;
  }

  clearAllFrames(): void {
    this.frames.clear();
    this.frameCounter = 1;
    console.log('[FrameService] Cleared all frames');
  }
} 