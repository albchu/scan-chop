import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  Image,
  read,
  write,
  encode,
  decode,
  encodeDataURL,
  createImage,
  getPixel,
  setPixel,
  crop,
  rotateRightAngle,
  transformRotate,
  resize,
  clone,
} from '../image-adapter';

// Guard that the adapter's Image is the v1 constructor during migration.
// Remove this import and the test block below in Phase 4 when the alias is eliminated.
import { Image as ImageV1 } from 'image-js-v1';

// ---------------------------------------------------------------------------
// Dual-version resolution (temporary — remove in Phase 4)
// ---------------------------------------------------------------------------

describe('dual-version resolution', () => {
  it('adapter exports the v1 Image constructor', () => {
    expect(Image).toBeDefined();
    expect(ImageV1).toBeDefined();
    expect(Image).toBe(ImageV1);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a white 50x40 RGBA test image with a dark 20x10 rectangle at (10, 15) */
function createTestImageWithRect(): Image {
  const img = createImage(50, 40, { colorModel: 'RGBA' });
  // Fill white background
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 50; x++) {
      setPixel(img, x, y, [255, 255, 255, 255]);
    }
  }
  // Draw dark rectangle
  for (let y = 15; y < 25; y++) {
    for (let x = 10; x < 30; x++) {
      setPixel(img, x, y, [40, 40, 40, 255]);
    }
  }
  return img;
}

let tempDir: string | null = null;

async function getTempDir(): Promise<string> {
  if (!tempDir) {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adapter-test-'));
  }
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

// ---------------------------------------------------------------------------
// I/O functions
// ---------------------------------------------------------------------------

describe('I/O functions', () => {
  describe('read() and write()', () => {
    it('should write an image to disk and read it back with correct dimensions', async () => {
      const original = createTestImageWithRect();
      const dir = await getTempDir();
      const filePath = path.join(dir, 'roundtrip.png');

      await write(filePath, original);
      const loaded = await read(filePath);

      expect(loaded.width).toBe(50);
      expect(loaded.height).toBe(40);
    });

    it('should preserve pixel values through write/read roundtrip', async () => {
      const original = createImage(10, 10, { colorModel: 'RGBA' });
      setPixel(original, 3, 7, [100, 150, 200, 255]);
      const dir = await getTempDir();
      const filePath = path.join(dir, 'pixel-roundtrip.png');

      await write(filePath, original);
      const loaded = await read(filePath);
      const pixel = getPixel(loaded, 3, 7);

      expect(pixel[0]).toBe(100);
      expect(pixel[1]).toBe(150);
      expect(pixel[2]).toBe(200);
    });
  });

  describe('encode()', () => {
    it('should return a Uint8Array', () => {
      const img = createImage(5, 5, { colorModel: 'RGBA' });
      const buf = encode(img);
      expect(buf).toBeInstanceOf(Uint8Array);
    });

    it('should produce valid PNG bytes (magic header)', () => {
      const img = createImage(5, 5, { colorModel: 'RGBA' });
      const buf = encode(img, { format: 'png' });

      // PNG magic bytes: 0x89 P N G
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    });
  });

  describe('decode()', () => {
    it('should decode a base64 data URL string and return correct dimensions', async () => {
      const img = createImage(12, 8, { colorModel: 'RGBA' });
      const dataURL = encodeDataURL(img);

      const decoded = await decode(dataURL);
      expect(decoded.width).toBe(12);
      expect(decoded.height).toBe(8);
    });
  });

  describe('encodeDataURL()', () => {
    it('should return a string starting with data:image/png;base64,', () => {
      const img = createImage(5, 5, { colorModel: 'RGBA' });
      const url = encodeDataURL(img);

      expect(typeof url).toBe('string');
      expect(url).toMatch(/^data:image\/png;base64,/);
    });

    it('should produce a non-trivial base64 payload', () => {
      const img = createImage(10, 10, { colorModel: 'RGBA' });
      const url = encodeDataURL(img);
      const base64 = url.replace(/^data:image\/\w+;base64,/, '');

      expect(base64.length).toBeGreaterThan(10);
    });
  });
});

// ---------------------------------------------------------------------------
// Image creation
// ---------------------------------------------------------------------------

describe('createImage()', () => {
  it('should create an image with correct width and height', () => {
    const img = createImage(100, 50);
    expect(img.width).toBe(100);
    expect(img.height).toBe(50);
  });

  it('should default to RGB (3 channels) when no options given', () => {
    const img = createImage(10, 10);
    expect(img.channels).toBe(3);
  });

  it('should create RGBA image with 4 channels', () => {
    const img = createImage(10, 10, { colorModel: 'RGBA' });
    expect(img.channels).toBe(4);
  });

  it('should create RGB image with 3 channels', () => {
    const img = createImage(10, 10, { colorModel: 'RGB' });
    expect(img.channels).toBe(3);
  });

  it('should create GREY image with 1 channel', () => {
    const img = createImage(10, 10, { colorModel: 'GREY' });
    expect(img.channels).toBe(1);
  });

  it('should create GREYA image with 2 channels', () => {
    const img = createImage(10, 10, { colorModel: 'GREYA' });
    expect(img.channels).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Pixel access
// ---------------------------------------------------------------------------

describe('Pixel access', () => {
  describe('getPixel() and setPixel()', () => {
    it('should roundtrip pixel values on an RGBA image', () => {
      const img = createImage(10, 10, { colorModel: 'RGBA' });
      setPixel(img, 5, 3, [10, 20, 30, 255]);

      const pixel = getPixel(img, 5, 3);
      expect(pixel[0]).toBe(10);
      expect(pixel[1]).toBe(20);
      expect(pixel[2]).toBe(30);
      expect(pixel[3]).toBe(255);
    });

    it('should roundtrip pixel values on a GREY image', () => {
      const img = createImage(10, 10, { colorModel: 'GREY' });
      setPixel(img, 2, 4, [128]);

      const pixel = getPixel(img, 2, 4);
      expect(pixel[0]).toBe(128);
    });

    it('should read pixels at image corners', () => {
      const img = createImage(20, 15, { colorModel: 'RGBA' });

      setPixel(img, 0, 0, [1, 2, 3, 4]);
      setPixel(img, 19, 0, [5, 6, 7, 8]);
      setPixel(img, 0, 14, [9, 10, 11, 12]);
      setPixel(img, 19, 14, [13, 14, 15, 16]);

      expect(getPixel(img, 0, 0)).toEqual([1, 2, 3, 4]);
      expect(getPixel(img, 19, 0)).toEqual([5, 6, 7, 8]);
      expect(getPixel(img, 0, 14)).toEqual([9, 10, 11, 12]);
      expect(getPixel(img, 19, 14)).toEqual([13, 14, 15, 16]);
    });

    it('should not interfere with adjacent pixels', () => {
      const img = createImage(10, 10, { colorModel: 'RGBA' });
      setPixel(img, 5, 5, [255, 0, 0, 255]);

      // Adjacent pixel should remain default (0)
      const adjacent = getPixel(img, 5, 6);
      expect(adjacent[0]).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Transform functions
// ---------------------------------------------------------------------------

describe('Transform functions', () => {
  describe('crop()', () => {
    it('should produce an image with the requested dimensions', () => {
      const img = createImage(100, 100, { colorModel: 'RGBA' });
      const cropped = crop(img, {
        origin: { column: 10, row: 20 },
        width: 50,
        height: 30,
      });

      expect(cropped.width).toBe(50);
      expect(cropped.height).toBe(30);
    });

    it('should preserve pixel at crop origin as (0,0) of output', () => {
      const img = createImage(100, 100, { colorModel: 'RGBA' });
      setPixel(img, 10, 20, [42, 84, 126, 255]);

      const cropped = crop(img, {
        origin: { column: 10, row: 20 },
        width: 50,
        height: 30,
      });

      const pixel = getPixel(cropped, 0, 0);
      expect(pixel[0]).toBe(42);
      expect(pixel[1]).toBe(84);
      expect(pixel[2]).toBe(126);
    });
  });

  describe('rotateRightAngle()', () => {
    it('should return the same image reference for 0 degrees', () => {
      const img = createImage(30, 20, { colorModel: 'RGBA' });
      const result = rotateRightAngle(img, 0);

      expect(result).toBe(img);
    });

    it('should swap width and height for 90 degrees', () => {
      const img = createImage(30, 20, { colorModel: 'RGBA' });
      const result = rotateRightAngle(img, 90);

      expect(result.width).toBe(20);
      expect(result.height).toBe(30);
    });

    it('should preserve dimensions for 180 degrees', () => {
      const img = createImage(30, 20, { colorModel: 'RGBA' });
      const result = rotateRightAngle(img, 180);

      expect(result.width).toBe(30);
      expect(result.height).toBe(20);
    });

    it('should swap width and height for 270 degrees', () => {
      const img = createImage(30, 20, { colorModel: 'RGBA' });
      const result = rotateRightAngle(img, 270);

      expect(result.width).toBe(20);
      expect(result.height).toBe(30);
    });
  });

  describe('transformRotate()', () => {
    it('should return an Image for arbitrary angle', () => {
      const img = createImage(40, 30, { colorModel: 'RGBA' });
      const result = transformRotate(img, 45);

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should expand canvas for non-trivial rotation', () => {
      const img = createImage(40, 30, { colorModel: 'RGBA' });
      const result = transformRotate(img, 45);

      // Rotated canvas must be at least as large as the original
      expect(result.width).toBeGreaterThanOrEqual(40);
      expect(result.height).toBeGreaterThanOrEqual(30);
    });

    it('should preserve dimensions for 0-degree rotation', () => {
      const img = createImage(40, 30, { colorModel: 'RGBA' });
      const result = transformRotate(img, 0);

      expect(result.width).toBe(40);
      expect(result.height).toBe(30);
    });
  });

  describe('resize()', () => {
    it('should resize to exact width with aspect ratio preserved', () => {
      const img = createImage(100, 100, { colorModel: 'RGBA' });
      const result = resize(img, { width: 50 });

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should resize with both width and height', () => {
      const img = createImage(100, 80, { colorModel: 'RGBA' });
      const result = resize(img, { width: 50, height: 40 });

      expect(result.width).toBe(50);
      expect(result.height).toBe(40);
    });
  });

  describe('clone()', () => {
    it('should produce an image with matching dimensions', () => {
      const img = createImage(25, 35, { colorModel: 'RGBA' });
      const cloned = clone(img);

      expect(cloned.width).toBe(25);
      expect(cloned.height).toBe(35);
    });

    it('should produce an independent copy (mutating clone does not affect original)', () => {
      const img = createImage(10, 10, { colorModel: 'RGBA' });
      setPixel(img, 0, 0, [100, 100, 100, 255]);

      const cloned = clone(img);
      setPixel(cloned, 0, 0, [200, 200, 200, 255]);

      const originalPixel = getPixel(img, 0, 0);
      expect(originalPixel[0]).toBe(100);

      const clonedPixel = getPixel(cloned, 0, 0);
      expect(clonedPixel[0]).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------
// Roundtrip integration tests
// ---------------------------------------------------------------------------

describe('Roundtrip integration', () => {
  it('should roundtrip: create -> setPixel -> encode -> decode -> getPixel', async () => {
    const img = createImage(10, 10, { colorModel: 'RGBA' });
    setPixel(img, 5, 5, [77, 133, 211, 255]);

    const dataURL = encodeDataURL(img);
    const decoded = await decode(dataURL);
    const pixel = getPixel(decoded, 5, 5);

    expect(pixel[0]).toBe(77);
    expect(pixel[1]).toBe(133);
    expect(pixel[2]).toBe(211);
  });

  it('should roundtrip: create -> write -> read -> dimensions match', async () => {
    const img = createImage(64, 48, { colorModel: 'RGBA' });
    const dir = await getTempDir();
    const filePath = path.join(dir, 'roundtrip-dims.png');

    await write(filePath, img);
    const loaded = await read(filePath);

    expect(loaded.width).toBe(64);
    expect(loaded.height).toBe(48);
  });

  it('should roundtrip: create -> encodeDataURL -> decode -> dimensions match', async () => {
    const img = createImage(32, 24, { colorModel: 'RGBA' });
    const dataURL = encodeDataURL(img);

    const decoded = await decode(dataURL);
    expect(decoded.width).toBe(32);
    expect(decoded.height).toBe(24);
  });

  it('should roundtrip: create -> encode(png) -> decode buffer -> dimensions match', async () => {
    const img = createImage(16, 12, { colorModel: 'RGBA' });
    const pngBuffer = encode(img, { format: 'png' });

    // Convert buffer to base64 data URL for decode (v0 adapter decode accepts strings)
    const base64 = Buffer.from(pngBuffer).toString('base64');
    const dataURL = `data:image/png;base64,${base64}`;
    const decoded = await decode(dataURL);

    expect(decoded.width).toBe(16);
    expect(decoded.height).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// v1 expected changes (documented for future reference)
// ---------------------------------------------------------------------------

describe('v1 behavioral confirmations', () => {
  // These tests confirm v1 behavior after the adapter swap.

  it('createImage(w, h) defaults to RGB (3 channels) in v1', () => {
    const img = createImage(10, 10);
    expect(img.channels).toBe(3);
  });

  it('decode() accepts string data URLs via adapter', async () => {
    // v1's native decode() requires ArrayBufferView, but the adapter
    // preserves string acceptance by base64-decoding internally.
    const img = createImage(5, 5, { colorModel: 'RGBA' });
    const dataURL = encodeDataURL(img);

    const decoded = await decode(dataURL);
    expect(decoded.width).toBe(5);
  });

  it('decode() is synchronous in v1', () => {
    const img = createImage(5, 5, { colorModel: 'RGBA' });
    const dataURL = encodeDataURL(img);

    const result = decode(dataURL);
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.width).toBe(5);
  });
});
