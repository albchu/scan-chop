import { FrameData, Vector2, ProcessingConfig } from '@workspace/shared';
import type { Image } from 'image-js';
import { processSingleSeed } from '@workspace/shared';

export class FrameService {
  private frames: Map<string, FrameData> = new Map();
  private frameCounter: number = 1;
  
  async generateFrameFromSeed(
    imagePath: string,
    image: { original: Image; scaled: Image },
    seed: Vector2,
    config?: ProcessingConfig
  ): Promise<FrameData> {
    // Process seed point to get bounding box
    const result = processSingleSeed(image.original, image.scaled, seed, {
      downsampleFactor: 0.5,
      whiteThreshold: 220,
      minArea: 100,
      cropInset: 8,
      ...config
    });
    
    // Create FrameData with unique ID
    const frameData: FrameData = {
      id: `frame-${this.frameCounter}`,
      label: `Frame ${this.frameCounter}`,
      x: result.boundingBox.x,
      y: result.boundingBox.y,
      width: result.boundingBox.width,
      height: result.boundingBox.height,
      rotation: result.boundingBox.rotation,
      orientation: 0
    };
    
    // Increment counter for next frame
    this.frameCounter++;
    
    // Persist in backend
    this.frames.set(frameData.id, frameData);
    
    console.log(`[FrameService] Generated and persisted frame: ${frameData.id}`);
    return frameData;
  }
  
  updateFrame(id: string, updates: Partial<FrameData>): FrameData | null {
    const frame = this.frames.get(id);
    if (!frame) {
      console.error(`[FrameService] Frame not found: ${id}`);
      return null;
    }
    
    // Update frame data, but don't allow changing ID
    const { id: _, ...safeUpdates } = updates;
    const updatedFrame = { ...frame, ...safeUpdates };
    this.frames.set(id, updatedFrame);
    
    console.log(`[FrameService] Updated frame: ${id}`, safeUpdates);
    return updatedFrame;
  }
  
  getFrame(id: string): FrameData | undefined {
    return this.frames.get(id);
  }
  
  getAllFrames(): FrameData[] {
    return Array.from(this.frames.values());
  }
  
  deleteFrame(id: string): boolean {
    const result = this.frames.delete(id);
    if (result) {
      console.log(`[FrameService] Deleted frame: ${id}`);
    }
    return result;
  }
  
  clearFrames(): void {
    this.frames.clear();
    this.frameCounter = 1;
    console.log('[FrameService] Cleared all frames');
  }
} 