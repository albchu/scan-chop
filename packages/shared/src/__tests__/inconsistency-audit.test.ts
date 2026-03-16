/**
 * Regression tests for two refactored inconsistencies in the shared package.
 *
 * Refactor 1 – White-threshold defaults unified to WHITE_THRESHOLD_DEFAULT
 *   Previously three locations each defined a different default (220, 230, 250).
 *   Now both createWhiteBoundaryPredicate and extractRegionWithWhiteBoundary
 *   fall back to WHITE_THRESHOLD_DEFAULT (220) when no value is provided.
 *   These tests verify the unified behavior at every layer.
 *
 * Refactor 2 – Duplicate region-scaling functions removed
 *   coordinate-utils.ts previously exported scaleRegion / scaleRegionFloat
 *   which duplicated scaleRegionCoordinates / scaleRegionCoordinatesFloat
 *   in region-extraction.ts. The coordinate-utils copies had zero imports
 *   and have been deleted. These tests verify the canonical functions in
 *   region-extraction.ts remain correct.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  Image,
  createImage,
  setPixel as adapterSetPixel,
} from '../image-adapter';
import type { RGB } from '../types';
import { WHITE_THRESHOLD_DEFAULT } from '../constants';
import { createWhiteBoundaryPredicate, calculateBrightness } from '../color';
import {
  extractRegionWithWhiteBoundary,
  scaleRegionCoordinates,
  scaleRegionCoordinatesFloat,
} from '../region-extraction';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestImage(
  width: number,
  height: number,
  fillColor: RGB = [0, 0, 0]
): Image {
  const image = createImage(width, height, { colorModel: 'RGBA' });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      adapterSetPixel(image, x, y, [
        fillColor[0],
        fillColor[1],
        fillColor[2],
        255,
      ]);
    }
  }
  return image;
}

function setPixel(image: Image, x: number, y: number, color: RGB): void {
  adapterSetPixel(image, x, y, [color[0], color[1], color[2], 255]);
}

/**
 * Build a test image with a dark interior surrounded by a 1-pixel border
 * at the given brightness. The interior is (w-2) x (h-2).
 */
function createBorderedImage(
  width: number,
  height: number,
  interiorColor: RGB,
  borderColor: RGB
): Image {
  const image = createTestImage(width, height, borderColor);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      setPixel(image, x, y, interiorColor);
    }
  }
  return image;
}

// ===========================================================================
// REFACTOR 1 – Unified white-threshold default (220)
// ===========================================================================

describe('Refactor 1: unified white-threshold default', () => {
  it('WHITE_THRESHOLD_DEFAULT constant is 220', () => {
    expect(WHITE_THRESHOLD_DEFAULT).toBe(220);
  });

  it('createWhiteBoundaryPredicate defaults to WHITE_THRESHOLD_DEFAULT', () => {
    const predicate = createWhiteBoundaryPredicate();
    const ref: RGB = [0, 0, 0];

    // Brightness 219 is below 220 → allowed through
    expect(predicate([219, 219, 219], ref)).toBe(true);
    // Brightness 220 is at threshold → blocked
    expect(predicate([220, 220, 220], ref)).toBe(false);
    // Brightness 255 → blocked
    expect(predicate([255, 255, 255], ref)).toBe(false);
  });

  it('extractRegionWithWhiteBoundary defaults to WHITE_THRESHOLD_DEFAULT when config omits whiteThreshold', () => {
    // 14x14 image → 12x12 interior (144 px) exceeds minArea default of 100
    const dark: RGB = [50, 50, 50];

    // Border at 220 blocks flood fill (>= threshold)
    const imgBlocked = createBorderedImage(14, 14, dark, [220, 220, 220]);
    const resultBlocked = extractRegionWithWhiteBoundary(imgBlocked, {
      x: 7,
      y: 7,
    });
    expect(resultBlocked.isValid).toBe(true);
    expect(resultBlocked.pixelCount).toBe(144);

    // Border at 219 leaks (below threshold)
    const imgLeaked = createBorderedImage(14, 14, dark, [219, 219, 219]);
    const resultLeaked = extractRegionWithWhiteBoundary(imgLeaked, {
      x: 7,
      y: 7,
    });
    expect(resultLeaked.pixelCount).toBeGreaterThan(144);
  });

  it('both layers agree: omitting config and passing WHITE_THRESHOLD_DEFAULT explicitly produce the same result', () => {
    const dark: RGB = [50, 50, 50];
    const img = createBorderedImage(14, 14, dark, [220, 220, 220]);

    const resultImplicit = extractRegionWithWhiteBoundary(img, { x: 7, y: 7 });
    const resultExplicit = extractRegionWithWhiteBoundary(
      img,
      { x: 7, y: 7 },
      { whiteThreshold: WHITE_THRESHOLD_DEFAULT }
    );

    expect(resultImplicit.pixelCount).toBe(resultExplicit.pixelCount);
    expect(resultImplicit.isValid).toBe(resultExplicit.isValid);
  });

  it('custom thresholds still override the default at both layers', () => {
    const predicate = createWhiteBoundaryPredicate(200);
    const ref: RGB = [0, 0, 0];

    // 200 is at custom threshold → blocked
    expect(predicate([200, 200, 200], ref)).toBe(false);
    // 199 is below → allowed
    expect(predicate([199, 199, 199], ref)).toBe(true);

    // extractRegionWithWhiteBoundary with custom threshold
    const dark: RGB = [50, 50, 50];
    const img = createBorderedImage(14, 14, dark, [200, 200, 200]);
    const result = extractRegionWithWhiteBoundary(
      img,
      { x: 7, y: 7 },
      { whiteThreshold: 200 }
    );
    expect(result.pixelCount).toBe(144); // confined to interior
  });

  it('a pixel at brightness 225 is consistently treated as boundary by default at all layers', () => {
    // Before the refactor, brightness 225 was treated differently at each layer:
    //   constant (220): blocked
    //   region-extraction (230): allowed
    //   predicate (250): allowed
    // After the refactor, all layers use 220, so 225 is blocked everywhere.
    const pixel: RGB = [225, 225, 225];
    expect(calculateBrightness(pixel)).toBe(225);

    // Bare predicate now uses 220 → blocks at 225
    const predicate = createWhiteBoundaryPredicate();
    expect(predicate(pixel, [0, 0, 0])).toBe(false);

    // extractRegionWithWhiteBoundary with no config also uses 220 → blocks at 225
    const dark: RGB = [50, 50, 50];
    const img = createBorderedImage(14, 14, dark, [225, 225, 225]);
    const result = extractRegionWithWhiteBoundary(img, { x: 7, y: 7 });
    expect(result.pixelCount).toBe(144); // confined, border blocked
  });
});

// ===========================================================================
// REFACTOR 2 – Canonical region-scaling functions (duplicates removed)
// ===========================================================================

describe('Refactor 2: canonical region-scaling functions', () => {
  const region: Array<[number, number]> = [
    [0, 0],
    [10, 20],
    [3, 7],
    [100, 200],
    [-5, -15],
    [0, 100],
    [999, 0],
  ];

  const scaleFactors = [0.3, 0.5, 1.5, 2.0, 3.7, 0.1, 10.0];

  // ---- scaleRegionCoordinatesFloat ----

  describe('scaleRegionCoordinatesFloat', () => {
    it('scales all coordinates without rounding', () => {
      const points: Array<[number, number]> = [[3, 7]];
      const sf = 0.3;
      const result = scaleRegionCoordinatesFloat(points, sf);

      expect(result[0][0]).toBe(3 * 0.3);
      expect(result[0][1]).toBe(7 * 0.3);
    });

    it('returns a shallow copy at scaleFactor 1.0 (preserving inner tuple refs)', () => {
      const original: Array<[number, number]> = [
        [1, 2],
        [3, 4],
      ];
      const result = scaleRegionCoordinatesFloat(original, 1.0);

      expect(result).not.toBe(original); // new outer array
      expect(result).toEqual(original); // same values
      expect(result[0]).toBe(original[0]); // inner tuples are same refs
    });

    it('returns empty array for empty input', () => {
      expect(scaleRegionCoordinatesFloat([], 2.0)).toEqual([]);
    });

    it('handles negative coordinates', () => {
      const result = scaleRegionCoordinatesFloat([[-5, -15]], 2.0);
      expect(result[0]).toEqual([-10, -30]);
    });

    it('handles multiple scale factors correctly', () => {
      for (const sf of scaleFactors) {
        const result = scaleRegionCoordinatesFloat(region, sf);
        expect(result).toHaveLength(region.length);
        for (let i = 0; i < region.length; i++) {
          expect(result[i][0]).toBe(region[i][0] * sf);
          expect(result[i][1]).toBe(region[i][1] * sf);
        }
      }
    });
  });

  // ---- scaleRegionCoordinates ----

  describe('scaleRegionCoordinates', () => {
    it('scales and rounds all coordinates', () => {
      const points: Array<[number, number]> = [[3, 7]];
      const sf = 0.3;
      const result = scaleRegionCoordinates(points, sf);

      expect(result[0][0]).toBe(Math.round(3 * 0.3));
      expect(result[0][1]).toBe(Math.round(7 * 0.3));
    });

    it('returns a shallow copy at scaleFactor 1.0 (preserving inner tuple refs)', () => {
      const original: Array<[number, number]> = [
        [1, 2],
        [3, 4],
      ];
      const result = scaleRegionCoordinates(original, 1.0);

      expect(result).not.toBe(original);
      expect(result).toEqual(original);
      expect(result[0]).toBe(original[0]);
    });

    it('returns empty array for empty input', () => {
      expect(scaleRegionCoordinates([], 2.0)).toEqual([]);
    });

    it('rounding half-values follows Math.round behavior', () => {
      const points: Array<[number, number]> = [
        [1, 1],
        [3, 3],
        [-1, -1],
      ];
      const sf = 0.5; // produces [0.5, 0.5], [1.5, 1.5], [-0.5, -0.5]

      const result = scaleRegionCoordinates(points, sf);
      expect(result[0]).toEqual([Math.round(0.5), Math.round(0.5)]);
      expect(result[1]).toEqual([Math.round(1.5), Math.round(1.5)]);
      expect(result[2]).toEqual([Math.round(-0.5), Math.round(-0.5)]);
    });

    it('handles multiple scale factors correctly', () => {
      for (const sf of scaleFactors) {
        const result = scaleRegionCoordinates(region, sf);
        expect(result).toHaveLength(region.length);
        for (let i = 0; i < region.length; i++) {
          expect(result[i][0]).toBe(Math.round(region[i][0] * sf));
          expect(result[i][1]).toBe(Math.round(region[i][1] * sf));
        }
      }
    });

    it('large region: 1000 points all correctly scaled and rounded', () => {
      const largeRegion: Array<[number, number]> = [];
      for (let i = 0; i < 1000; i++) {
        largeRegion.push([(i * 17) % 500, (i * 31) % 500]);
      }

      for (const sf of [0.3, 1.7, 0.001]) {
        const result = scaleRegionCoordinates(largeRegion, sf);
        for (let i = 0; i < largeRegion.length; i++) {
          expect(result[i][0]).toBe(Math.round(largeRegion[i][0] * sf));
          expect(result[i][1]).toBe(Math.round(largeRegion[i][1] * sf));
        }
      }
    });
  });

  // ---- Verify dead exports are actually gone ----

  it('coordinate-utils.ts no longer exports scaleRegion or scaleRegionFloat', async () => {
    const coordUtils = await import('../coordinate-utils');
    expect('scaleRegion' in coordUtils).toBe(false);
    expect('scaleRegionFloat' in coordUtils).toBe(false);
  });
});
