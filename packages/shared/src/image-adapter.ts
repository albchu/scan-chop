/**
 * Adapter layer isolating all direct image-js usage.
 * Every other module imports from here instead of 'image-js' directly.
 */
import {
  Image,
  read as ijsRead,
  write as ijsWrite,
  encode as ijsEncode,
  decode as ijsDecode,
  encodeDataURL as ijsEncodeDataURL,
} from 'image-js';

// Re-export the Image class for type and value usage
export { Image };
export type { Image as ImageType };

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/** Load an image from a file path. */
export async function read(filePath: string): Promise<Image> {
  return ijsRead(filePath);
}

/** Write an image to a file path (format inferred from extension). */
export async function write(filePath: string, image: Image): Promise<void> {
  await ijsWrite(filePath, image);
}

/** Encode an image to a buffer (synchronous) */
export function encode(
  image: Image,
  opts?: { format: 'png' | 'jpg' | 'jpeg' | 'bmp' }
): Uint8Array {
  return ijsEncode(image, opts ?? { format: 'png' });
}

/**
 * Decode an image from a buffer or data URL string (synchronous).
 *
 * image-js's decode() requires an ArrayBufferView — it does not accept data URL strings.
 * This adapter preserves string acceptance by stripping the data URL prefix and
 * base64-decoding to a buffer internally.
 */
export function decode(source: ArrayBufferView | string): Image {
  if (typeof source === 'string') {
    const base64 = source.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    return ijsDecode(buffer);
  }
  return ijsDecode(source);
}

/** Encode an image as a base64 data URL string */
export function encodeDataURL(image: Image): string {
  return ijsEncodeDataURL(image);
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
 * image-js behavioral differences corrected here:
 * - Positive angles rotate counter-clockwise; negated to match clockwise convention.
 * - Canvas expansion requires { fullImage: true } (not the default).
 * - Background fill defaults to opaque black; set to transparent.
 * - borderValue length must match the image's channel count (image-js validates this).
 */
export function transformRotate(image: Image, angle: number): Image {
  const borderValue = new Array(image.channels).fill(0);
  return image.transformRotate(-angle, {
    fullImage: true,
    borderType: 'constant',
    borderValue,
  });
}

/** Passthrough to image-js resize for consistency with adapter pattern */
export function resize(
  image: Image,
  options: { width: number; height?: number }
): Image {
  return image.resize(options);
}

/** Passthrough to image-js clone for consistency with adapter pattern */
export function clone(image: Image): Image {
  return image.clone();
}
