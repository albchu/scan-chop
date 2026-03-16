/**
 * Adapter layer isolating all direct image-js usage behind v1-shaped function signatures.
 * Every other module imports from here instead of 'image-js' directly.
 *
 * Phase 3: Now delegates to image-js v1 via the 'image-js-v1' package alias.
 * The alias will be replaced with the real 'image-js' package name in Phase 4.
 *
 * Note: v1's read() and write() use process.getBuiltinModule() to detect Node.js,
 * which requires Node.js 22.3+. Electron 28 bundles Node.js 18.x, so we implement
 * read/write directly using fs + decode/encode to bypass that check.
 */
import {
  Image,
  encode as v1Encode,
  decode as v1Decode,
  encodeDataURL as v1EncodeDataURL,
} from 'image-js-v1';
import { readFile, writeFile } from 'fs/promises';
import { extname } from 'path';

// Re-export the Image class for type and value usage
export { Image };
export type { Image as ImageType };

// ---------------------------------------------------------------------------
// I/O: implemented directly with fs to avoid v1's getBuiltinModule() check
// ---------------------------------------------------------------------------

/**
 * Load an image from a file path.
 *
 * WORKAROUND: Uses fs.readFile + v1Decode instead of v1's read() because v1
 * detects Node.js via process.getBuiltinModule (requires Node.js 22.3+).
 * Electron 28 bundles Node.js 18.x which lacks that API, so v1's read()
 * throws "read is only implemented for Node.js". Once the project upgrades
 * to Electron 38+ (Node.js 22+), this can be replaced with v1's read().
 */
export async function read(filePath: string): Promise<Image> {
  const data = await readFile(filePath);
  return v1Decode(data);
}

/**
 * Write an image to a file path (format inferred from extension).
 *
 * WORKAROUND: Same getBuiltinModule issue as read() above — uses
 * v1Encode + fs.writeFile instead of v1's write(). Can be replaced with
 * v1's write() once the project upgrades to Electron 38+ (Node.js 22+).
 */
export async function write(filePath: string, image: Image): Promise<void> {
  const ext = extname(filePath).slice(1).toLowerCase();
  const format =
    ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'bmp' ? 'bmp' : 'png';
  const data = v1Encode(image, { format });
  await writeFile(filePath, data);
}

/** Encode an image to a buffer (synchronous) */
export function encode(
  image: Image,
  opts?: { format: 'png' | 'jpg' | 'jpeg' | 'bmp' }
): Uint8Array {
  return v1Encode(image, opts ?? { format: 'png' });
}

/**
 * Decode an image from a buffer or data URL string (synchronous).
 *
 * v1's decode() requires an ArrayBufferView — it does not accept data URL strings.
 * This adapter preserves string acceptance by stripping the data URL prefix and
 * base64-decoding to a buffer internally.
 */
export function decode(source: ArrayBufferView | string): Image {
  if (typeof source === 'string') {
    const base64 = source.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    return v1Decode(buffer);
  }
  return v1Decode(source);
}

/** Encode an image as a base64 data URL string */
export function encodeDataURL(image: Image): string {
  return v1EncodeDataURL(image);
}

// ---------------------------------------------------------------------------
// Image creation
// ---------------------------------------------------------------------------

export interface CreateImageOptions {
  colorModel?: 'GREY' | 'GREYA' | 'RGB' | 'RGBA';
  bitDepth?: 8 | 16;
  data?: Uint8Array | Uint16Array;
}

/** Create a new image with the given dimensions and options */
export function createImage(
  width: number,
  height: number,
  options?: CreateImageOptions
): Image {
  if (!options) {
    return new Image(width, height);
  }
  return new Image(width, height, {
    colorModel: options.colorModel,
    bitDepth: options.bitDepth,
    data: options.data,
  });
}

// ---------------------------------------------------------------------------
// Pixel access
// ---------------------------------------------------------------------------

/** Read the pixel value at (column, row) */
export function getPixel(image: Image, column: number, row: number): number[] {
  return image.getPixel(column, row);
}

/** Set the pixel value at (column, row) */
export function setPixel(
  image: Image,
  column: number,
  row: number,
  value: number[]
): void {
  image.setPixel(column, row, value);
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

export interface CropOptions {
  origin: { column: number; row: number };
  width: number;
  height: number;
}

/** Crop a rectangular region from an image */
export function crop(image: Image, options: CropOptions): Image {
  return image.crop({
    origin: { column: options.origin.column, row: options.origin.row },
    width: options.width,
    height: options.height,
  });
}

/** Rotate by a right angle (90/180/270). Returns the image unchanged for 0. */
export function rotateRightAngle(
  image: Image,
  angle: 0 | 90 | 180 | 270
): Image {
  if (angle === 0) return image;
  return image.rotate(angle as 90 | 180 | 270);
}

/**
 * Rotate by an arbitrary angle (expands canvas to fit the full rotated image).
 *
 * v1 differences corrected here:
 * - Angle convention is opposite to v0: negated to preserve caller expectations.
 * - Canvas expansion requires { fullImage: true } (v0 expanded by default).
 * - Background fill defaults to opaque black in v1; set to transparent to match v0.
 * - borderValue length must match the image's channel count (v1 validates this).
 */
export function transformRotate(image: Image, angle: number): Image {
  const borderValue = new Array(image.channels).fill(0);
  return image.transformRotate(-angle, {
    fullImage: true,
    borderType: 'constant',
    borderValue,
  });
}

/** v1 resize signature is compatible; passthrough for consistency */
export function resize(
  image: Image,
  options: { width: number; height?: number }
): Image {
  return image.resize(options);
}

/** Clone is unchanged between versions; included for completeness */
export function clone(image: Image): Image {
  return image.clone();
}
