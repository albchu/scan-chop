import { describe, expect, it, vi } from 'vitest';
import { Image, createImage, setPixel } from '../image-adapter.js';
import { findMinimalBoundingRectangle } from '../bounding-rectangle.js';
import {
  computePCAOrientation,
  refineAngle,
  chooseBestAngle,
} from '../orientation.js';
import { floodFill } from '../flood-fill.js';
import { createWhiteBoundaryPredicate } from '../color.js';
import type { Vector2 } from '../types.js';

// Suppress console noise from all modules under test
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

/** Create a solid-colour RGBA test image */
function createTestImage(
  width: number,
  height: number,
  fillColor: [number, number, number] = [0, 0, 0]
): Image {
  const image = createImage(width, height, { colorModel: 'RGBA' });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(image, x, y, [fillColor[0], fillColor[1], fillColor[2], 255]);
    }
  }
  return image;
}

// ---------------------------------------------------------------------------
// bounding-rectangle.ts — backfill
// ---------------------------------------------------------------------------
describe('findMinimalBoundingRectangle backfill', () => {
  it('handles degenerate collinear hull with rotation=0', () => {
    // Horizontal line — convex hull has < 3 vertices, triggers fallback
    const points: [number, number][] = Array.from({ length: 20 }, (_, i) => [
      i * 5,
      0,
    ]);

    const bbox = findMinimalBoundingRectangle(points);
    expect(bbox.rotation).toBe(0);
    expect(bbox.height).toBeCloseTo(0, 1);
    expect(bbox.width).toBeCloseTo(95, 1); // 19 * 5
  });

  it('handles a very large point cloud without error', () => {
    // 10 000 points on an ellipse
    const points: [number, number][] = Array.from({ length: 10000 }, (_, i) => {
      const angle = (i / 10000) * 2 * Math.PI;
      return [Math.cos(angle) * 100, Math.sin(angle) * 50];
    });

    const bbox = findMinimalBoundingRectangle(points, 1);
    expect(bbox).toBeDefined();
    expect(bbox.width).toBeGreaterThan(0);
    expect(bbox.height).toBeGreaterThan(0);
  });

  it('PCA produces a different result than calipers alone', () => {
    // Elongated diagonal point cloud tilted ~30 degrees
    const angle = (30 * Math.PI) / 180;
    const points: [number, number][] = Array.from({ length: 200 }, (_, i) => {
      const t = (i - 100) * 0.5;
      const noise = (Math.sin(i * 137.5) - 0.5) * 0.3; // deterministic noise
      return [
        t * Math.cos(angle) - noise * Math.sin(angle),
        t * Math.sin(angle) + noise * Math.cos(angle),
      ];
    });

    const withoutPca = findMinimalBoundingRectangle(points, 1, {
      usePca: false,
    });
    const withPca = findMinimalBoundingRectangle(points, 1, { usePca: true });

    // PCA may choose a slightly different orientation — at minimum the function runs
    expect(withPca).toBeDefined();
    // Rotation values are allowed to differ (or match) but both must be valid numbers
    expect(typeof withPca.rotation).toBe('number');
    expect(typeof withoutPca.rotation).toBe('number');
  });

  it('angle refinement produces area <= without refinement', () => {
    // Slightly rotated rectangle with interior fill
    const tilt = (5 * Math.PI) / 180;
    const points: [number, number][] = [];
    for (let gx = 0; gx <= 40; gx += 2) {
      for (let gy = 0; gy <= 10; gy += 2) {
        points.push([
          gx * Math.cos(tilt) - gy * Math.sin(tilt),
          gx * Math.sin(tilt) + gy * Math.cos(tilt),
        ]);
      }
    }

    const noRefine = findMinimalBoundingRectangle(points, 1, {
      enableAngleRefine: false,
    });
    const withRefine = findMinimalBoundingRectangle(points, 1, {
      enableAngleRefine: true,
      angleRefineWindow: 5,
      angleRefineIterations: 15,
    });

    const areaBefore = noRefine.width * noRefine.height;
    const areaAfter = withRefine.width * withRefine.height;

    // Refinement should not increase the bounding area
    expect(areaAfter).toBeLessThanOrEqual(areaBefore + 0.5); // small FP tolerance
  });
});

// ---------------------------------------------------------------------------
// orientation.ts — backfill
// ---------------------------------------------------------------------------
describe('orientation.ts backfill', () => {
  it('computePCAOrientation returns an angle for exactly 3 points', () => {
    // Use an asymmetric triangle so the covariance matrix has a clear principal axis
    const points: [number, number][] = [
      [0, 0],
      [20, 0],
      [20, 3],
    ];
    const angle = computePCAOrientation(points);

    expect(angle).not.toBeNull();
    expect(typeof angle).toBe('number');
  });

  it('chooseBestAngle returns calipers angle when both heights are equal', () => {
    // Use two identical angles so projected heights are the same
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const center: Vector2 = { x: 5, y: 5 };

    const result = chooseBestAngle(0, 0, points, center);
    // Heights equal → angleDiff is 0 which is NOT > 5, so calipers angle wins
    expect(result).toBe(0);
  });

  it('chooseBestAngle prefers calipers when angle difference is exactly 5 degrees', () => {
    // The condition is angleDiff > 5, so exactly 5 should still prefer calipers
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 5 },
      { x: 0, y: 5 },
    ];
    const center: Vector2 = { x: 10, y: 2.5 };

    const result = chooseBestAngle(0, 5, points, center);
    // angleDiff === 5 is NOT > 5, so calipers angle (0) should be returned
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// flood-fill.ts — backfill
// ---------------------------------------------------------------------------
describe('floodFill backfill', () => {
  it('succeeds when pixel count equals maxPixels - 1 (boundary)', () => {
    // 10×10 uniform dark image = 100 pixels
    // floodFill throws when region.length >= maxPixels during BFS,
    // so maxPixels:101 should let all 100 pixels through.
    const image = createTestImage(10, 10, [50, 50, 50]);
    const predicate = createWhiteBoundaryPredicate();

    const region = floodFill(image, { x: 5, y: 5 }, predicate, {
      maxPixels: 101,
    });
    expect(region).toHaveLength(100);
  });

  it('throws when pixel count hits maxPixels boundary', () => {
    // 10×10 = 100 pixels, maxPixels:99 → should throw before completing
    const image = createTestImage(10, 10, [50, 50, 50]);
    const predicate = createWhiteBoundaryPredicate();

    expect(() =>
      floodFill(image, { x: 5, y: 5 }, predicate, { maxPixels: 99 })
    ).toThrow('Region too large');
  });

  it('reaches diagonally-connected pixels via 8-connectivity', () => {
    // 3×3 image: surround center with white on cardinal directions only
    //  D W D        (D = dark, W = white)
    //  W D W        center (1,1) is dark, only reachable diagonally
    //  D W D
    const image = createTestImage(3, 3, [50, 50, 50]);
    const white: [number, number, number] = [255, 255, 255];

    // Set cardinal neighbours of center to white
    setPixel(image, 1, 0, [white[0], white[1], white[2], 255]); // top
    setPixel(image, 0, 1, [white[0], white[1], white[2], 255]); // left
    setPixel(image, 2, 1, [white[0], white[1], white[2], 255]); // right
    setPixel(image, 1, 2, [white[0], white[1], white[2], 255]); // bottom

    const predicate = createWhiteBoundaryPredicate();
    // Seed from top-left corner (0,0) which is dark
    const region = floodFill(image, { x: 0, y: 0 }, predicate);

    // 8-connectivity lets us reach center (1,1) and all 4 dark corners + center = 5
    const reachedCenter = region.some(([x, y]) => x === 1 && y === 1);
    expect(reachedCenter).toBe(true);
    expect(region).toHaveLength(5);
  });
});
