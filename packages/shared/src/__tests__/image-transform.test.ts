import { describe, expect, it, vi } from 'vitest';
import { Image, createImage, setPixel, getPixel } from '../image-adapter.js';
import {
  calculateRotatedBounds,
  applyInsetCrop,
  rotateAndCrop,
  extractRotatedRectangle,
  smartCrop,
  createRotatedRectangleMask,
  batchTransform,
} from '../image-transform.js';
import type { BoundingBox } from '../types.js';

// Suppress console.log from production code
vi.spyOn(console, 'log').mockImplementation(() => {});

/**
 * Create a test image filled with a deterministic gradient pattern
 * so we can verify crop operations produce the expected sub-region.
 */
function createTestImage(width: number, height: number): Image {
  const image = createImage(width, height, { colorModel: 'RGBA' });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(image, x, y, [x % 256, y % 256, (x + y) % 256, 255]);
    }
  }
  return image;
}

// ---------------------------------------------------------------------------
// calculateRotatedBounds
// ---------------------------------------------------------------------------
describe('calculateRotatedBounds', () => {
  it('should return bounds equal to bbox for zero rotation', () => {
    const bbox: BoundingBox = {
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      rotation: 0,
    };
    const result = calculateRotatedBounds(bbox, 500, 500);

    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    // width = maxX - minX + 1 where corners span [10, 110] → floor(10)..ceil(110) + 1
    expect(result.width).toBe(101);
    expect(result.height).toBe(51);
  });

  it('should produce a larger AABB for a 45-degree rotation', () => {
    const bbox: BoundingBox = {
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      rotation: 45,
    };
    const result = calculateRotatedBounds(bbox, 500, 500);

    // The axis-aligned envelope of a rotated rectangle is strictly larger
    // than the original dimensions along both axes.
    const diagonal = Math.sqrt(100 * 100 + 50 * 50); // ~111.8
    expect(result.width).toBeGreaterThan(100);
    expect(result.height).toBeGreaterThan(50);
    // But should not exceed the diagonal + 2 (for ceil/floor + 1 arithmetic)
    expect(result.width).toBeLessThanOrEqual(Math.ceil(diagonal) + 2);
    expect(result.height).toBeLessThanOrEqual(Math.ceil(diagonal) + 2);
  });

  it('should swap width and height in AABB for a 90-degree rotation', () => {
    const bbox: BoundingBox = {
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      rotation: 90,
    };
    const result = calculateRotatedBounds(bbox, 500, 500);

    // At 90°, the AABB width ≈ original height, AABB height ≈ original width
    // Allow ±2 for floor/ceil rounding
    expect(result.width).toBeCloseTo(51, -1);
    expect(result.height).toBeCloseTo(101, -1);
  });

  it('should clamp bounds to image dimensions', () => {
    // Box extends well beyond the 200×200 image
    const bbox: BoundingBox = {
      x: 150,
      y: 150,
      width: 100,
      height: 100,
      rotation: 30,
    };
    const result = calculateRotatedBounds(bbox, 200, 200);

    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    // maxX clamped to imageWidth - 1, so width = (199 - minX + 1)
    expect(result.x + result.width - 1).toBeLessThanOrEqual(199);
    expect(result.y + result.height - 1).toBeLessThanOrEqual(199);
  });

  it('should handle a tiny 1×1 bounding box', () => {
    const bbox: BoundingBox = { x: 5, y: 5, width: 1, height: 1, rotation: 0 };
    const result = calculateRotatedBounds(bbox, 100, 100);

    // Even a 1×1 box should produce at least 1×1 output after floor/ceil
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// applyInsetCrop
// ---------------------------------------------------------------------------
describe('applyInsetCrop', () => {
  it('should return the same image reference for zero inset', () => {
    const image = createTestImage(100, 100);
    const result = applyInsetCrop(image, 0);

    expect(result).toBe(image);
  });

  it('should return the same image reference for negative inset', () => {
    const image = createTestImage(100, 100);
    const result = applyInsetCrop(image, -5);

    expect(result).toBe(image);
  });

  it('should reduce dimensions by 2×inset for a normal inset', () => {
    const image = createTestImage(100, 100);
    const result = applyInsetCrop(image, 5);

    expect(result.width).toBe(90);
    expect(result.height).toBe(90);
  });

  it('should throw when inset exceeds image dimensions (crop origin out of range)', () => {
    const image = createTestImage(10, 10);

    // cropX = 20, but image is only 10 wide — image-js rejects the origin
    expect(() => applyInsetCrop(image, 20)).toThrow();
  });

  it('should clamp each dimension independently on an asymmetric image', () => {
    const image = createTestImage(200, 50);
    const result = applyInsetCrop(image, 30);

    // width: max(1, 200 - 60) = 140
    // height: max(1, 50 - 60) = 1
    expect(result.width).toBe(140);
    expect(result.height).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rotateAndCrop
// ---------------------------------------------------------------------------
describe('rotateAndCrop', () => {
  it('should skip rotation when angle is below minRotation threshold', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 30,
      y: 30,
      width: 80,
      height: 60,
      rotation: 0.1,
    };

    // Default minRotation = 0.2, so 0.1° is below threshold
    const result = rotateAndCrop(image, 0.1, bbox);

    expect(result.width).toBe(80);
    expect(result.height).toBe(60);
  });

  it('should perform a simple rectangular crop at zero rotation', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 10,
      y: 10,
      width: 50,
      height: 40,
      rotation: 0,
    };

    const result = rotateAndCrop(image, 0, bbox);

    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
  });

  it('should produce an image when rotation exceeds minRotation', () => {
    const image = createTestImage(300, 300);
    const bbox: BoundingBox = {
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      rotation: 10,
    };

    const result = rotateAndCrop(image, 10, bbox);

    // The output may not match bbox exactly due to rotation expansion,
    // but should be roughly the same ballpark.
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.width).toBeLessThanOrEqual(120); // some tolerance
    expect(result.height).toBeLessThanOrEqual(100);
  });

  it('should apply cropInset after the crop', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 20,
      y: 20,
      width: 100,
      height: 80,
      rotation: 0,
    };

    const result = rotateAndCrop(image, 0, bbox, { cropInset: 5 });

    // Without inset: 100×80, with 5px inset: 90×70
    expect(result.width).toBe(90);
    expect(result.height).toBe(70);
  });

  it('should throw when bbox extends beyond image bounds (no clamping in skip-rotation path)', () => {
    const image = createTestImage(100, 100);
    // Box at (80,80) with size 30×30 extends to 110 — past the 100px boundary
    const bbox: BoundingBox = {
      x: 80,
      y: 80,
      width: 30,
      height: 30,
      rotation: 0.1,
    };

    // image-js crop rejects out-of-range coordinates
    expect(() => rotateAndCrop(image, 0.1, bbox)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// extractRotatedRectangle
// ---------------------------------------------------------------------------
describe('extractRotatedRectangle', () => {
  it('should produce reasonable output for a small rotation', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 50,
      y: 50,
      width: 80,
      height: 60,
      rotation: 2,
    };

    const result = extractRotatedRectangle(image, bbox);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    // Output should be in the vicinity of the original bbox dimensions
    expect(result.width).toBeLessThanOrEqual(100);
    expect(result.height).toBeLessThanOrEqual(80);
  });

  it('should approximately match bbox dimensions for zero rotation', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 30,
      y: 30,
      width: 100,
      height: 60,
      rotation: 0,
    };

    const result = extractRotatedRectangle(image, bbox);

    expect(result.width).toBe(100);
    expect(result.height).toBe(60);
  });

  it('should not crash when bbox is at the image corner (0,0)', () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      rotation: 5,
    };

    // Corners may extend into negative coords; calculateRotatedBounds clamps to 0
    const result = extractRotatedRectangle(image, bbox);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// smartCrop
// ---------------------------------------------------------------------------
describe('smartCrop', () => {
  it('should apply default cropInset of 8 pixels', () => {
    const image = createTestImage(400, 400);
    const bbox: BoundingBox = {
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      rotation: 0,
    };

    const result = smartCrop(image, bbox);

    // Zero rotation → direct crop of 200×100 then 8px inset → 184×84
    expect(result.width).toBe(184);
    expect(result.height).toBe(84);
  });

  it('should produce a larger output when padding is applied', () => {
    const image = createTestImage(400, 400);
    const bbox: BoundingBox = {
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      rotation: 0,
    };

    const withoutPadding = smartCrop(image, bbox, { cropInset: 0 });
    const withPadding = smartCrop(image, bbox, { padding: 10, cropInset: 0 });

    // Padding expands the bbox by 10px on each side → +20 in each dimension
    expect(withPadding.width).toBeGreaterThan(withoutPadding.width);
    expect(withPadding.height).toBeGreaterThan(withoutPadding.height);
  });

  it('should work correctly with zero rotation', () => {
    const image = createTestImage(300, 300);
    const bbox: BoundingBox = {
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      rotation: 0,
    };

    const result = smartCrop(image, bbox, { cropInset: 0 });

    expect(result.width).toBe(100);
    expect(result.height).toBe(80);
  });

  it('should pass custom cropInset through to extractRotatedRectangle', () => {
    const image = createTestImage(400, 400);
    const bbox: BoundingBox = {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
    };

    const result = smartCrop(image, bbox, { cropInset: 0 });

    // cropInset=0 means no trimming — output should match bbox exactly
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('should produce different sizes for cropInset=0 vs default cropInset=8', () => {
    const image = createTestImage(400, 400);
    const bbox: BoundingBox = {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
    };

    const withDefault = smartCrop(image, bbox);
    const withZero = smartCrop(image, bbox, { cropInset: 0 });

    // Default inset removes 16px total per dimension
    expect(withZero.width).toBeGreaterThan(withDefault.width);
    expect(withZero.height).toBeGreaterThan(withDefault.height);
    expect(withZero.width - withDefault.width).toBe(16);
    expect(withZero.height - withDefault.height).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// createRotatedRectangleMask
// ---------------------------------------------------------------------------
describe('createRotatedRectangleMask', () => {
  it('should mark pixels inside an axis-aligned rectangle as 255', () => {
    const bbox: BoundingBox = {
      x: 10,
      y: 10,
      width: 50,
      height: 30,
      rotation: 0,
    };
    const mask = createRotatedRectangleMask(100, 100, bbox);

    expect(mask.width).toBe(100);
    expect(mask.height).toBe(100);

    // Center of the rectangle should be inside
    expect(getPixel(mask, 35, 25)[0]).toBe(255);
    // Just inside top-left region
    expect(getPixel(mask, 15, 15)[0]).toBe(255);

    // Outside the rectangle
    expect(getPixel(mask, 0, 0)[0]).toBe(0);
    expect(getPixel(mask, 99, 99)[0]).toBe(0);
    // Below the rectangle
    expect(getPixel(mask, 35, 50)[0]).toBe(0);
  });

  it('should have center pixel inside for a 45-degree rotated rectangle', () => {
    // Place a rectangle centered roughly at (50,50)
    const bbox: BoundingBox = {
      x: 50,
      y: 20,
      width: 60,
      height: 30,
      rotation: 45,
    };
    const mask = createRotatedRectangleMask(150, 150, bbox);

    // The geometric center of the rotated rectangle should be inside
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const cx = Math.round(
      bbox.x + (bbox.width / 2) * cos45 - (bbox.height / 2) * sin45
    );
    const cy = Math.round(
      bbox.y + (bbox.width / 2) * sin45 + (bbox.height / 2) * cos45
    );
    expect(getPixel(mask, cx, cy)[0]).toBe(255);

    // A point far from the rectangle should be outside
    expect(getPixel(mask, 0, 0)[0]).toBe(0);
    expect(getPixel(mask, 149, 149)[0]).toBe(0);
  });

  it('should produce a mask matching the requested dimensions', () => {
    const bbox: BoundingBox = {
      x: 10,
      y: 10,
      width: 30,
      height: 20,
      rotation: 0,
    };
    const mask = createRotatedRectangleMask(100, 100, bbox);

    expect(mask.width).toBe(100);
    expect(mask.height).toBe(100);
    expect(mask.components).toBe(1);
  });

  it('should produce correct pixel-level results for a small 5×5 mask', () => {
    // Place a small 3×3 box starting at (1,1)
    const bbox: BoundingBox = { x: 1, y: 1, width: 3, height: 3, rotation: 0 };
    const mask = createRotatedRectangleMask(5, 5, bbox);

    // Build an expected map: pixels inside [1..4)×[1..4) should be 255
    // The ray-casting algorithm considers boundary pixels; check interior with certainty
    // Center of the box at (2,2) must be inside
    expect(getPixel(mask, 2, 2)[0]).toBe(255);

    // Corners of the image (0,0) and (4,4) are outside
    expect(getPixel(mask, 0, 0)[0]).toBe(0);
    expect(getPixel(mask, 4, 4)[0]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// batchTransform
// ---------------------------------------------------------------------------
describe('batchTransform', () => {
  it('should throw when images and boundingBoxes arrays have different lengths', async () => {
    const images = [createTestImage(100, 100), createTestImage(100, 100)];
    const boundingBoxes: BoundingBox[] = [
      { x: 10, y: 10, width: 50, height: 50, rotation: 0 },
      { x: 10, y: 10, width: 50, height: 50, rotation: 0 },
      { x: 10, y: 10, width: 50, height: 50, rotation: 0 },
    ];

    await expect(batchTransform({ images, boundingBoxes })).rejects.toThrow(
      'Number of images must match'
    );
  });

  it('should return an empty array for empty inputs', async () => {
    const result = await batchTransform({ images: [], boundingBoxes: [] });

    expect(result).toEqual([]);
  });

  it('should process a single image and return one result', async () => {
    const image = createTestImage(200, 200);
    const bbox: BoundingBox = {
      x: 20,
      y: 20,
      width: 80,
      height: 60,
      rotation: 0,
    };

    const results = await batchTransform({
      images: [image],
      boundingBoxes: [bbox],
      config: { cropInset: 0 },
    });

    expect(results).toHaveLength(1);
    expect(results[0].width).toBe(80);
    expect(results[0].height).toBe(60);
  });

  it('should produce the same number of outputs in both parallel and sequential modes', async () => {
    const images = [createTestImage(200, 200), createTestImage(200, 200)];
    const boundingBoxes: BoundingBox[] = [
      { x: 10, y: 10, width: 60, height: 40, rotation: 0 },
      { x: 20, y: 20, width: 80, height: 50, rotation: 0 },
    ];

    const parallelResults = await batchTransform({
      images,
      boundingBoxes,
      config: { cropInset: 0 },
      parallel: true,
    });

    const sequentialResults = await batchTransform({
      images,
      boundingBoxes,
      config: { cropInset: 0 },
      parallel: false,
    });

    expect(parallelResults).toHaveLength(2);
    expect(sequentialResults).toHaveLength(2);

    // Both modes should produce images with the same dimensions
    for (let i = 0; i < 2; i++) {
      expect(parallelResults[i].width).toBe(sequentialResults[i].width);
      expect(parallelResults[i].height).toBe(sequentialResults[i].height);
    }
  });
});
