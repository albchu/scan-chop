import { describe, expect, it, vi } from 'vitest';
import { Image, createImage, setPixel } from '../image-adapter';
import {
  extractRegionFromSeed,
  extractMultipleRegions,
  refineRegionBoundaries,
  validateRegion,
} from '../region-extraction';
import { createWhiteBoundaryPredicate } from '../color';
import type { RGB } from '../types';

// Mock console methods to suppress log noise from flood-fill and extractMultipleRegions
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Helper to create test images filled with a uniform color
function createTestImage(
  width: number,
  height: number,
  fillColor: RGB = [0, 0, 0]
): Image {
  const image = createImage(width, height, { colorModel: 'RGBA' });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(image, x, y, [fillColor[0], fillColor[1], fillColor[2], 255]);
    }
  }
  return image;
}

function setRGBPixel(image: Image, x: number, y: number, color: RGB): void {
  setPixel(image, x, y, [color[0], color[1], color[2], 255]);
}

/**
 * Build a bordered image: white (255) border, dark interior.
 * Returns the image and the expected interior pixel count.
 */
function createBorderedImage(
  width: number,
  height: number,
  interiorColor: RGB = [100, 100, 100],
  borderColor: RGB = [255, 255, 255]
): { image: Image; interiorCount: number } {
  const image = createTestImage(width, height, interiorColor);
  // Paint white border on all four edges
  for (let x = 0; x < width; x++) {
    setRGBPixel(image, x, 0, borderColor);
    setRGBPixel(image, x, height - 1, borderColor);
  }
  for (let y = 0; y < height; y++) {
    setRGBPixel(image, 0, y, borderColor);
    setRGBPixel(image, width - 1, y, borderColor);
  }
  const interiorCount = (width - 2) * (height - 2);
  return { image, interiorCount };
}

// ─── extractRegionFromSeed ────────────────────────────────────────────────────

describe('extractRegionFromSeed', () => {
  it('should return a valid region for a bordered image seeded in the interior', () => {
    const { image, interiorCount } = createBorderedImage(14, 14);
    const predicate = createWhiteBoundaryPredicate(230);

    const result = extractRegionFromSeed(image, { x: 7, y: 7 }, predicate);

    expect(result.isValid).toBe(true);
    expect(result.pixelCount).toBe(interiorCount); // 12*12 = 144
    expect(result.points).toHaveLength(interiorCount);
    expect(result.validationErrors).toBeUndefined();
  });

  it('should mark a region below minArea as invalid', () => {
    // 5x5 bordered → 3x3 = 9 interior pixels, well below default minArea of 100
    const { image } = createBorderedImage(5, 5);
    const predicate = createWhiteBoundaryPredicate(230);

    const result = extractRegionFromSeed(image, { x: 2, y: 2 }, predicate);

    expect(result.isValid).toBe(false);
    expect(result.pixelCount).toBe(9);
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors!.some((e) => e.includes('too small'))).toBe(
      true
    );
  });

  it('should respect a custom maxPixels passed via config', () => {
    // 14x14 bordered → 144 interior pixels, under a generous maxPixels
    const { image } = createBorderedImage(14, 14);
    const predicate = createWhiteBoundaryPredicate(230);

    const result = extractRegionFromSeed(image, { x: 7, y: 7 }, predicate, {
      maxPixels: 200,
      minArea: 1,
    });

    expect(result.isValid).toBe(true);
    expect(result.pixelCount).toBe(144);
  });

  it('should propagate out-of-bounds errors from floodFill', () => {
    const image = createTestImage(10, 10, [100, 100, 100]);
    const predicate = createWhiteBoundaryPredicate(230);

    expect(() =>
      extractRegionFromSeed(image, { x: -1, y: 0 }, predicate)
    ).toThrow('Seed point out of image bounds');
  });

  it('should propagate "No region found" when predicate rejects the seed pixel', () => {
    const image = createTestImage(10, 10, [100, 100, 100]);
    // Predicate that rejects everything
    const rejectAll = () => false;

    expect(() =>
      extractRegionFromSeed(image, { x: 5, y: 5 }, rejectAll)
    ).toThrow('No region found');
  });

  it('should honour custom minArea so a normally-valid region becomes invalid', () => {
    // 14x14 bordered → 144 pixels, but require minArea of 200
    const { image } = createBorderedImage(14, 14);
    const predicate = createWhiteBoundaryPredicate(230);

    const result = extractRegionFromSeed(image, { x: 7, y: 7 }, predicate, {
      minArea: 200,
    });

    expect(result.isValid).toBe(false);
    expect(result.pixelCount).toBe(144);
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors!.some((e) => e.includes('too small'))).toBe(
      true
    );
  });
});

// ─── extractMultipleRegions ───────────────────────────────────────────────────

describe('extractMultipleRegions', () => {
  it('should extract valid regions from multiple interior seeds', () => {
    const { image } = createBorderedImage(14, 14);
    const predicate = createWhiteBoundaryPredicate(230);

    const results = extractMultipleRegions(
      image,
      [
        { x: 3, y: 3 },
        { x: 10, y: 10 },
      ],
      predicate,
      { minArea: 1 }
    );

    expect(results).toHaveLength(2);
    // Both seeds land in the same connected interior, so both should succeed
    results.forEach((r) => {
      expect(r.isValid).toBe(true);
      expect(r.pixelCount).toBe(144);
    });
  });

  it('should catch errors for a failing seed while succeeding for others', () => {
    const { image } = createBorderedImage(14, 14);
    const predicate = createWhiteBoundaryPredicate(230);

    const results = extractMultipleRegions(
      image,
      [
        { x: -1, y: -1 }, // out of bounds → error
        { x: 7, y: 7 }, // valid interior seed
      ],
      predicate,
      { minArea: 1 }
    );

    expect(results).toHaveLength(2);

    // First seed failed
    expect(results[0].isValid).toBe(false);
    expect(results[0].pixelCount).toBe(0);
    expect(results[0].points).toHaveLength(0);
    expect(
      results[0].validationErrors!.some((e) => e.includes('Extraction failed'))
    ).toBe(true);

    // Second seed succeeded
    expect(results[1].isValid).toBe(true);
    expect(results[1].pixelCount).toBe(144);
  });

  it('should return all-invalid results when every seed fails', () => {
    // All-white image: seeds on white pixels trigger 'No region found'
    const image = createTestImage(10, 10, [255, 255, 255]);
    const predicate = createWhiteBoundaryPredicate(230);

    const results = extractMultipleRegions(
      image,
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 9, y: 9 },
      ],
      predicate
    );

    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.isValid).toBe(false);
      expect(r.pixelCount).toBe(0);
      expect(r.points).toHaveLength(0);
      expect(r.validationErrors).toBeDefined();
      expect(
        r.validationErrors!.some((e) => e.includes('Extraction failed'))
      ).toBe(true);
    });
  });

  it('should return an empty array for an empty seeds list', () => {
    const image = createTestImage(10, 10);
    const predicate = createWhiteBoundaryPredicate(230);

    const results = extractMultipleRegions(image, [], predicate);

    expect(results).toEqual([]);
  });
});

// ─── refineRegionBoundaries ──────────────────────────────────────────────────

describe('refineRegionBoundaries', () => {
  // Dummy image required by the signature but unused by the implementation
  const dummyImage = createTestImage(20, 20);

  it('should return a shallow copy when both options are disabled', () => {
    const region: Array<[number, number]> = [
      [0, 0],
      [5, 5],
      [10, 10],
    ];

    const result = refineRegionBoundaries(region, dummyImage, {
      removeIsolatedPixels: false,
      fillSmallGaps: false,
    });

    expect(result).toEqual(region);
    // Verify it is a different array reference (shallow copy)
    expect(result).not.toBe(region);
  });

  it('should remove isolated pixels while keeping connected blocks', () => {
    // 3x3 block at (5,5)-(7,7), plus one isolated pixel at (0,0)
    const block: Array<[number, number]> = [];
    for (let y = 5; y <= 7; y++) {
      for (let x = 5; x <= 7; x++) {
        block.push([x, y]);
      }
    }
    const isolated: [number, number] = [0, 0];
    const region = [isolated, ...block];

    const result = refineRegionBoundaries(region, dummyImage, {
      removeIsolatedPixels: true,
      fillSmallGaps: false,
      minNeighbors: 2,
    });

    // Isolated pixel (0,0) has 0 neighbors in the region → removed
    expect(result.some(([x, y]) => x === 0 && y === 0)).toBe(false);
    // Block pixels should survive (center has 8 neighbors, edges have 3-5)
    expect(result.length).toBe(9);
  });

  it('should remove edge pixels of a block when minNeighbors is raised', () => {
    // 3x3 block: corner pixels have 3 neighbors, edge-midpoints have 5, center has 8
    const block: Array<[number, number]> = [];
    for (let y = 0; y <= 2; y++) {
      for (let x = 0; x <= 2; x++) {
        block.push([x, y]);
      }
    }

    const result = refineRegionBoundaries(block, dummyImage, {
      removeIsolatedPixels: true,
      fillSmallGaps: false,
      minNeighbors: 4,
    });

    // Corner pixels (0,0),(2,0),(0,2),(2,2) have exactly 3 neighbors → removed
    // Edge midpoints (1,0),(0,1),(2,1),(1,2) have 5 neighbors → kept
    // Center (1,1) has 8 neighbors → kept
    expect(result.length).toBe(5);
    expect(result.some(([x, y]) => x === 0 && y === 0)).toBe(false);
    expect(result.some(([x, y]) => x === 1 && y === 1)).toBe(true);
  });

  it('should fill a gap pixel surrounded by region neighbours', () => {
    // 3x3 block missing the center pixel — center has 8 region neighbours
    const region: Array<[number, number]> = [];
    for (let y = 0; y <= 2; y++) {
      for (let x = 0; x <= 2; x++) {
        if (x === 1 && y === 1) continue; // gap
        region.push([x, y]);
      }
    }

    const result = refineRegionBoundaries(region, dummyImage, {
      removeIsolatedPixels: false,
      fillSmallGaps: true,
    });

    // The gap at (1,1) has 8 region neighbours via countNeighbors (which uses
    // the original regionSet), so it qualifies for filling (>= 6).
    // Note: the implementation doesn't deduplicate additions — each of the 8
    // surrounding refined pixels discovers (1,1) as a fillable gap, so (1,1)
    // is appended once per discoverer.
    expect(result.some(([x, y]) => x === 1 && y === 1)).toBe(true);
    expect(result.length).toBeGreaterThan(8);
    // Verify unique points include all 9 positions of the 3x3 grid
    const unique = new Set(result.map(([x, y]) => `${x},${y}`));
    expect(unique.size).toBe(9);
  });

  it('should first remove isolated pixels, then fill gaps when both enabled', () => {
    // 3x3 block missing center, plus one far-flung isolated pixel
    const block: Array<[number, number]> = [];
    for (let y = 0; y <= 2; y++) {
      for (let x = 0; x <= 2; x++) {
        if (x === 1 && y === 1) continue; // gap
        block.push([x, y]);
      }
    }
    const isolated: [number, number] = [15, 15];
    const region = [...block, isolated];

    const result = refineRegionBoundaries(region, dummyImage, {
      removeIsolatedPixels: true,
      fillSmallGaps: true,
      minNeighbors: 2,
    });

    // Isolated pixel should be removed (0 neighbours)
    expect(result.some(([x, y]) => x === 15 && y === 15)).toBe(false);
    // Gap at (1,1) should be filled — its 8 neighbours in original regionSet
    // survive isolation removal (each has >= 2 neighbours), so countNeighbors
    // for (1,1) still reports >= 6 using the original regionSet
    expect(result.some(([x, y]) => x === 1 && y === 1)).toBe(true);
  });

  it('should handle an empty region gracefully', () => {
    const result = refineRegionBoundaries([], dummyImage, {
      removeIsolatedPixels: true,
      fillSmallGaps: true,
    });

    expect(result).toEqual([]);
  });

  it('should leave a dense grid untouched when all pixels have enough neighbours', () => {
    // 5x5 grid — every pixel has at least 3 neighbours (corners have 3)
    const grid: Array<[number, number]> = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        grid.push([x, y]);
      }
    }

    const result = refineRegionBoundaries(grid, dummyImage, {
      removeIsolatedPixels: true,
      fillSmallGaps: false,
      minNeighbors: 2,
    });

    // No pixel should be removed — even corner pixels have 3 >= 2 neighbours
    expect(result.length).toBe(25);
  });
});

// ─── validateRegion ──────────────────────────────────────────────────────────

describe('validateRegion', () => {
  /** Generate an array of N dummy points */
  const makePoints = (n: number): Array<[number, number]> =>
    Array.from({ length: n }, (_, i) => [i, 0] as [number, number]);

  it('should report a valid region with no errors', () => {
    const result = validateRegion(makePoints(500));

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should flag a region below minArea as too small', () => {
    const result = validateRegion(makePoints(50), 100);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('too small'))).toBe(true);
  });

  it('should flag a region exceeding maxPixels as too large', () => {
    const result = validateRegion(makePoints(2_000_001));

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('too large'))).toBe(true);
  });

  it('should flag an empty region with both "too small" and "empty" errors', () => {
    const result = validateRegion([]);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('too small'))).toBe(true);
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    expect(result.errors).toHaveLength(2);
  });

  it('should treat exact boundary values correctly', () => {
    // Exactly minArea → valid (100 is NOT < 100)
    const atMinArea = validateRegion(makePoints(100), 100, 2_000_000);
    expect(atMinArea.isValid).toBe(true);

    // Exactly maxPixels → valid (100 is NOT > 100)
    const atMaxPixels = validateRegion(makePoints(100), 1, 100);
    expect(atMaxPixels.isValid).toBe(true);

    // One above maxPixels → invalid (101 > 100)
    const aboveMaxPixels = validateRegion(makePoints(101), 1, 100);
    expect(aboveMaxPixels.isValid).toBe(false);
    expect(aboveMaxPixels.errors.some((e) => e.includes('too large'))).toBe(
      true
    );
  });
});
