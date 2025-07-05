import { describe, expect, it, vi } from 'vitest';
import { Image } from 'image-js';
import { floodFill, type FloodFillConfig } from '../flood-fill';
import { createWhiteBoundaryPredicate } from '../color';
import type { Vector2, RGB } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Helper to create test images
function createTestImage(width: number, height: number, fillColor: RGB = [0, 0, 0]): Image {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillColor[0];
    data[i * 4 + 1] = fillColor[1];
    data[i * 4 + 2] = fillColor[2];
    data[i * 4 + 3] = 255; // Alpha
  }
  return new Image(width, height, { data, components: 4 });
}

// Helper to set pixel color
function setPixel(image: Image, x: number, y: number, color: RGB): void {
  image.setPixelXY(x, y, [color[0], color[1], color[2], 255]);
}

describe('floodFill', () => {
  it('should throw error if seed point is out of bounds', () => {
    const image = createTestImage(10, 10);
    const predicate = createWhiteBoundaryPredicate();
    
    expect(() => floodFill(image, { x: -1, y: 5 }, predicate)).toThrow('Seed point out of image bounds');
    expect(() => floodFill(image, { x: 5, y: -1 }, predicate)).toThrow('Seed point out of image bounds');
    expect(() => floodFill(image, { x: 10, y: 5 }, predicate)).toThrow('Seed point out of image bounds');
    expect(() => floodFill(image, { x: 5, y: 10 }, predicate)).toThrow('Seed point out of image bounds');
  });

  it('should fill entire uniform image', () => {
    const image = createTestImage(5, 5, [100, 100, 100]);
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate();
    
    const region = floodFill(image, seed, predicate);
    
    // Should fill all 25 pixels
    expect(region).toHaveLength(25);
  });

  it('should respect white boundaries', () => {
    const image = createTestImage(5, 5, [100, 100, 100]);
    
    // Create white border
    for (let x = 0; x < 5; x++) {
      setPixel(image, x, 0, [255, 255, 255]); // Top
      setPixel(image, x, 4, [255, 255, 255]); // Bottom
    }
    for (let y = 0; y < 5; y++) {
      setPixel(image, 0, y, [255, 255, 255]); // Left
      setPixel(image, 4, y, [255, 255, 255]); // Right
    }
    
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate();
    
    const region = floodFill(image, seed, predicate);
    
    // Should only fill interior 3x3 = 9 pixels
    expect(region).toHaveLength(9);
  });

  it('should handle custom white threshold', () => {
    const image = createTestImage(5, 5, [100, 100, 100]);
    
    // Create light gray border (brightness = 200)
    for (let x = 0; x < 5; x++) {
      setPixel(image, x, 0, [200, 200, 200]);
      setPixel(image, x, 4, [200, 200, 200]);
    }
    
    const seed: Vector2 = { x: 2, y: 2 };
    
    // With default threshold (250), should fill through gray
    const predicate1 = createWhiteBoundaryPredicate(250);
    const region1 = floodFill(image, seed, predicate1);
    expect(region1.length).toBeGreaterThan(9);
    
    // With lower threshold (180), should stop at gray
    const predicate2 = createWhiteBoundaryPredicate(180);
    const region2 = floodFill(image, seed, predicate2);
    expect(region2.length).toBeLessThan(region1.length);
  });

  it('should handle downsample factor', () => {
    const image = createTestImage(10, 10, [100, 100, 100]);
    const seed: Vector2 = { x: 5, y: 5 };
    const predicate = createWhiteBoundaryPredicate();
    
    // With downsample factor 2, output coordinates should be doubled
    const region = floodFill(image, seed, predicate, {}, 2.0);
    
    // Check that all coordinates are scaled
    region.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(20); // 10 * 2
      expect(y).toBeLessThanOrEqual(20); // 10 * 2
    });
  });

  it('should respect maxPixels limit', () => {
    const image = createTestImage(100, 100, [100, 100, 100]);
    const seed: Vector2 = { x: 50, y: 50 };
    const predicate = createWhiteBoundaryPredicate();
    
    const config: FloodFillConfig = { maxPixels: 100 };
    
    expect(() => floodFill(image, seed, predicate, config)).toThrow('Region too large: exceeded 100 pixels');
  });

  it('should warn about step parameter', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    warnSpy.mockClear();
    
    const image = createTestImage(5, 5, [100, 100, 100]);
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate();
    
    floodFill(image, seed, predicate, { step: 2 });
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Step > 1 is not supported')
    );
  });

  it('should handle disconnected regions', () => {
    const image = createTestImage(7, 7, [100, 100, 100]);
    
    // Create white divider
    for (let y = 0; y < 7; y++) {
      setPixel(image, 3, y, [255, 255, 255]);
    }
    
    const seed: Vector2 = { x: 1, y: 3 };
    const predicate = createWhiteBoundaryPredicate();
    
    const region = floodFill(image, seed, predicate);
    
    // Should only fill left side (3 columns * 7 rows = 21 pixels)
    expect(region).toHaveLength(21);
    
    // All points should be on left side
    region.forEach(([x, _y]) => {
      expect(x).toBeLessThan(3);
    });
  });

  it('should use 8-directional connectivity', () => {
    const image = createTestImage(5, 5, [100, 100, 100]);
    
    // Create diagonal barrier with gaps
    setPixel(image, 0, 0, [255, 255, 255]);
    setPixel(image, 2, 2, [255, 255, 255]);
    setPixel(image, 4, 4, [255, 255, 255]);
    
    const seed: Vector2 = { x: 0, y: 4 };
    const predicate = createWhiteBoundaryPredicate();
    
    const region = floodFill(image, seed, predicate);
    
    // Should be able to reach top-right through diagonal connections
    const hasTopRight = region.some(([x, y]) => x === 4 && y === 0);
    expect(hasTopRight).toBe(true);
  });

  it('should throw error if no region found', () => {
    const image = createTestImage(5, 5, [255, 255, 255]); // All white
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate(200); // Will reject white
    
    expect(() => floodFill(image, seed, predicate)).toThrow('No region found');
  });

  it('should handle mixed color regions', () => {
    const image = createTestImage(5, 5);
    
    // Create checkerboard pattern
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if ((x + y) % 2 === 0) {
          setPixel(image, x, y, [100, 100, 100]);
        } else {
          setPixel(image, x, y, [150, 150, 150]);
        }
      }
    }
    
    const seed: Vector2 = { x: 0, y: 0 };
    const predicate = createWhiteBoundaryPredicate();
    
    const region = floodFill(image, seed, predicate);
    
    // Should fill entire image (both colors are below white threshold)
    expect(region).toHaveLength(25);
  });

  it('should log seed pixel information', () => {
    const logSpy = vi.spyOn(console, 'log');
    logSpy.mockClear();
    
    const image = createTestImage(5, 5, [123, 45, 67]);
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate();
    
    floodFill(image, seed, predicate);
    
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Seed pixel: RGB(123, 45, 67)')
    );
  });

  it('should warn about bright seed pixels', () => {
    const logSpy = vi.spyOn(console, 'log');
    logSpy.mockClear();
    
    const image = createTestImage(5, 5, [210, 210, 210]); // Bright gray
    const seed: Vector2 = { x: 2, y: 2 };
    const predicate = createWhiteBoundaryPredicate();
    
    floodFill(image, seed, predicate);
    
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning: Seed pixel is very bright')
    );
  });

  it('should handle edge seeds correctly', () => {
    const image = createTestImage(5, 5, [100, 100, 100]);
    const predicate = createWhiteBoundaryPredicate();
    
    // Test all edge positions
    const edgeSeeds: Vector2[] = [
      { x: 0, y: 0 }, // Top-left corner
      { x: 4, y: 0 }, // Top-right corner
      { x: 0, y: 4 }, // Bottom-left corner
      { x: 4, y: 4 }, // Bottom-right corner
      { x: 2, y: 0 }, // Top edge
      { x: 2, y: 4 }, // Bottom edge
      { x: 0, y: 2 }, // Left edge
      { x: 4, y: 2 }, // Right edge
    ];
    
    edgeSeeds.forEach(seed => {
      const region = floodFill(image, seed, predicate);
      expect(region).toHaveLength(25); // Should still fill entire image
    });
  });
}); 