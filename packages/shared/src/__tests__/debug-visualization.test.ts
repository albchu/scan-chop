import { describe, expect, it, vi } from 'vitest';
import {
  Image,
  createImage,
  setPixel,
  getPixel,
  clone,
} from '../image-adapter.js';
import {
  drawCircle,
  drawThickCircle,
  drawLine,
  drawRectangle,
  highlightRegion,
  createDebugImage,
  createCompositeDebugImage,
} from '../debug-visualization.js';
import type { BoundingBox, Vector2 } from '../types.js';

// Suppress console noise from drawing functions and fs operations
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

/** Create a solid black RGBA test image */
function createTestImage(width: number, height: number): Image {
  const image = createImage(width, height, { colorModel: 'RGBA' });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(image, x, y, [0, 0, 0, 255]);
    }
  }
  return image;
}

/** Check if a pixel has been modified from the initial black fill */
function isPixelSet(image: Image, x: number, y: number): boolean {
  const p = getPixel(image, x, y);
  return p[0] !== 0 || p[1] !== 0 || p[2] !== 0;
}

// ---------------------------------------------------------------------------
// drawCircle
// ---------------------------------------------------------------------------
describe('drawCircle', () => {
  it('draws pixels on the circumference inside bounds', () => {
    const image = createTestImage(100, 100);
    drawCircle(image, { x: 50, y: 50 }, 10, [255, 0, 0, 255]);

    // Point on the right edge of the circle at (60, 50)
    expect(isPixelSet(image, 60, 50)).toBe(true);
  });

  it('handles circle at the image edge without crashing', () => {
    const image = createTestImage(100, 100);

    // Center at corner — most of the circle is clipped
    expect(() =>
      drawCircle(image, { x: 0, y: 0 }, 5, [255, 0, 0, 255])
    ).not.toThrow();

    // At least the in-bounds octant pixels should be drawn
    let anySet = false;
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 6; y++) {
        if (isPixelSet(image, x, y)) anySet = true;
      }
    }
    expect(anySet).toBe(true);
  });

  it('draws a single pixel when radius is 0', () => {
    const image = createTestImage(100, 100);
    drawCircle(image, { x: 50, y: 50 }, 0, [0, 255, 0, 255]);

    expect(isPixelSet(image, 50, 50)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// drawThickCircle
// ---------------------------------------------------------------------------
describe('drawThickCircle', () => {
  it('produces the same result as drawCircle when inner equals outer', () => {
    const imageThick = createTestImage(100, 100);
    const imageSingle = createTestImage(100, 100);
    const color = [255, 0, 0, 255];

    drawThickCircle(imageThick, { x: 50, y: 50 }, 10, 10, color);
    drawCircle(imageSingle, { x: 50, y: 50 }, 10, color);

    // Every pixel should match
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const pThick = getPixel(imageThick, x, y);
        const pSingle = getPixel(imageSingle, x, y);
        expect(pThick).toEqual(pSingle);
      }
    }
  });

  it('covers more pixels than a single-radius circle', () => {
    const imageThick = createTestImage(100, 100);
    const imageSingle = createTestImage(100, 100);
    const color = [255, 0, 0, 255];

    drawThickCircle(imageThick, { x: 50, y: 50 }, 5, 10, color);
    drawCircle(imageSingle, { x: 50, y: 50 }, 5, color);

    let thickCount = 0;
    let singleCount = 0;
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        if (isPixelSet(imageThick, x, y)) thickCount++;
        if (isPixelSet(imageSingle, x, y)) singleCount++;
      }
    }
    expect(thickCount).toBeGreaterThan(singleCount);
  });
});

// ---------------------------------------------------------------------------
// drawLine
// ---------------------------------------------------------------------------
describe('drawLine', () => {
  it('draws a horizontal line', () => {
    const image = createTestImage(100, 100);
    drawLine(image, { x: 0, y: 50 }, { x: 99, y: 50 }, [255, 255, 0, 255]);

    expect(isPixelSet(image, 50, 50)).toBe(true);
  });

  it('draws a vertical line', () => {
    const image = createTestImage(100, 100);
    drawLine(image, { x: 50, y: 0 }, { x: 50, y: 99 }, [255, 255, 0, 255]);

    expect(isPixelSet(image, 50, 50)).toBe(true);
  });

  it('draws a diagonal line', () => {
    const image = createTestImage(100, 100);
    drawLine(image, { x: 0, y: 0 }, { x: 99, y: 99 }, [255, 255, 0, 255]);

    expect(isPixelSet(image, 50, 50)).toBe(true);
  });

  it('draws a single pixel when both endpoints are the same', () => {
    const image = createTestImage(100, 100);
    drawLine(image, { x: 50, y: 50 }, { x: 50, y: 50 }, [255, 255, 0, 255]);

    expect(isPixelSet(image, 50, 50)).toBe(true);

    // No other pixel in the same row should be set
    let rowSetCount = 0;
    for (let x = 0; x < 100; x++) {
      if (isPixelSet(image, x, 50)) rowSetCount++;
    }
    expect(rowSetCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// drawRectangle
// ---------------------------------------------------------------------------
describe('drawRectangle', () => {
  it('draws an axis-aligned rectangle outline', () => {
    const image = createTestImage(100, 100);
    const box: BoundingBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 60,
      rotation: 0,
    };

    drawRectangle(image, box, [0, 255, 0, 255]);

    // Corner pixel should be set (on the outline)
    expect(isPixelSet(image, 10, 10)).toBe(true);

    // Interior pixel should NOT be set (only outline is drawn)
    expect(isPixelSet(image, 50, 40)).toBe(false);
  });

  it('draws differently when rotated 45 degrees', () => {
    const imageFlat = createTestImage(100, 100);
    const imageRot = createTestImage(100, 100);
    const color = [0, 255, 0, 255];

    const boxFlat: BoundingBox = {
      x: 30,
      y: 30,
      width: 40,
      height: 20,
      rotation: 0,
    };
    const boxRot: BoundingBox = {
      x: 30,
      y: 30,
      width: 40,
      height: 20,
      rotation: 45,
    };

    drawRectangle(imageFlat, boxFlat, color);
    drawRectangle(imageRot, boxRot, color);

    // Collect set-pixel positions for each
    let differ = false;
    for (let y = 0; y < 100 && !differ; y++) {
      for (let x = 0; x < 100 && !differ; x++) {
        if (isPixelSet(imageFlat, x, y) !== isPixelSet(imageRot, x, y)) {
          differ = true;
        }
      }
    }
    expect(differ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// highlightRegion
// ---------------------------------------------------------------------------
describe('highlightRegion', () => {
  it('sets all in-bounds points', () => {
    const image = createTestImage(100, 100);
    const points: [number, number][] = [
      [10, 10],
      [20, 20],
      [30, 30],
    ];
    highlightRegion(image, points, [255, 0, 0, 255]);

    for (const [x, y] of points) {
      expect(isPixelSet(image, x, y)).toBe(true);
    }
  });

  it('skips out-of-bounds points without crashing', () => {
    const image = createTestImage(50, 50);
    const points: [number, number][] = [
      [-5, 10],
      [10, 10],
      [200, 200],
    ];

    expect(() =>
      highlightRegion(image, points, [255, 0, 0, 255])
    ).not.toThrow();

    // The in-bounds point should still be drawn
    expect(isPixelSet(image, 10, 10)).toBe(true);
  });

  it('does nothing on an empty region', () => {
    const image = createTestImage(50, 50);
    const before = clone(image);

    highlightRegion(image, [], [255, 0, 0, 255]);

    // Every pixel should remain unchanged
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        expect(getPixel(image, x, y)).toEqual(getPixel(before, x, y));
      }
    }
  });
});

// ---------------------------------------------------------------------------
// createDebugImage
// ---------------------------------------------------------------------------
describe('createDebugImage', () => {
  it('clones the base image so the original is not mutated', () => {
    const base = createTestImage(50, 50);
    const originalPixel = getPixel(base, 25, 25).slice();

    createDebugImage(base, {
      region: [[25, 25]],
      regionColor: [255, 0, 0, 255],
    });

    // Original should remain black at that pixel
    expect(getPixel(base, 25, 25).slice()).toEqual(originalPixel);
  });

  it('applies all overlay types', () => {
    const base = createTestImage(100, 100);

    const result = createDebugImage(base, {
      region: [
        [10, 10],
        [11, 11],
      ],
      regionColor: [255, 0, 0, 255],
      boundingBox: { x: 20, y: 20, width: 40, height: 30, rotation: 0 },
      boundingBoxColor: [0, 0, 255, 255],
      seed: { x: 50, y: 50 },
      seedColor: [0, 255, 0, 255],
      seedRadius: { inner: 3, outer: 5 },
      markers: [
        { point: { x: 70, y: 70 }, color: [255, 255, 0, 255], size: 3 },
      ],
    });

    // The returned image should differ from the base somewhere
    let anyDifference = false;
    for (let y = 0; y < 100 && !anyDifference; y++) {
      for (let x = 0; x < 100 && !anyDifference; x++) {
        const bp = getPixel(base, x, y);
        const rp = getPixel(result, x, y);
        if (bp[0] !== rp[0] || bp[1] !== rp[1] || bp[2] !== rp[2]) {
          anyDifference = true;
        }
      }
    }
    expect(anyDifference).toBe(true);
  });

  it('returns a pixel-identical clone when options are empty', () => {
    const base = createTestImage(30, 30);
    const result = createDebugImage(base, {});

    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        expect(getPixel(result, x, y)).toEqual(getPixel(base, x, y));
      }
    }
  });
});

// ---------------------------------------------------------------------------
// createCompositeDebugImage
// ---------------------------------------------------------------------------
describe('createCompositeDebugImage', () => {
  it('throws on an empty images array', () => {
    expect(() => createCompositeDebugImage([])).toThrow(
      'No images provided for composite'
    );
  });

  it('returns same dimensions for a single image', () => {
    const img = createTestImage(60, 40);
    const composite = createCompositeDebugImage([img]);

    expect(composite.width).toBe(60);
    expect(composite.height).toBe(40);
  });

  it('computes correct dimensions for horizontal layout with gap', () => {
    const img1 = createTestImage(50, 50);
    const img2 = createTestImage(50, 50);
    const composite = createCompositeDebugImage([img1, img2], 'horizontal', 10);

    // 50 + 10 + 50 = 110 wide, max height = 50
    expect(composite.width).toBe(110);
    expect(composite.height).toBe(50);
  });
});
