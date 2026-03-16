/**
 * Adapter layer isolating all direct image-js usage behind v1-shaped function signatures.
 * Every other module imports from here instead of 'image-js' directly.
 * When migrating to image-js v1, only this file needs to change.
 */
import { Image } from 'image-js';

// Re-export the Image class for type and value usage
export { Image };
export type { Image as ImageType };

// ---------------------------------------------------------------------------
// I/O: standalone functions matching v1 signatures
// ---------------------------------------------------------------------------

/** v1: read(path) replaces Image.load(path) */
export async function read(path: string): Promise<Image> {
  return Image.load(path);
}

/** v1: write(path, image) replaces image.save(path) */
export async function write(path: string, image: Image): Promise<void> {
  await image.save(path);
}

/** v1: encode(image, opts) replaces image.toBuffer(opts) */
export function encode(image: Image, opts?: { format: string }): Uint8Array {
  return image.toBuffer(opts ?? { format: 'png' });
}

/** v1: decode(buffer) replaces Image.load(dataURL) for in-memory data */
export async function decode(source: string): Promise<Image> {
  return Image.load(source);
}

/** v1: encodeDataURL(image) replaces image.toDataURL() */
export function encodeDataURL(image: Image): string {
  return image.toDataURL();
}

// ---------------------------------------------------------------------------
// Image creation
// ---------------------------------------------------------------------------

export interface CreateImageOptions {
  colorModel?: 'GREY' | 'GREYA' | 'RGB' | 'RGBA';
  bitDepth?: 8 | 16;
  data?: Uint8Array | Uint16Array;
}

/** Wraps the Image constructor, translating v1 colorModel to v0 options */
export function createImage(
  width: number,
  height: number,
  options?: CreateImageOptions
): Image {
  if (!options) {
    return new Image(width, height);
  }
  const v0Opts: Record<string, unknown> = {};
  if (options.bitDepth) v0Opts.bitDepth = options.bitDepth;
  if (options.data) v0Opts.data = options.data;
  if (options.colorModel) {
    // v0 separates color components from alpha: components = non-alpha channels
    const colorModelMap: Record<
      string,
      { components: number; alpha: boolean }
    > = {
      GREY: { components: 1, alpha: false },
      GREYA: { components: 1, alpha: true },
      RGB: { components: 3, alpha: false },
      RGBA: { components: 3, alpha: true },
    };
    const mapping = colorModelMap[options.colorModel] ?? {
      components: 3,
      alpha: false,
    };
    v0Opts.components = mapping.components;
    v0Opts.alpha = mapping.alpha;
  }
  return new Image(width, height, v0Opts);
}

// ---------------------------------------------------------------------------
// Pixel access
// ---------------------------------------------------------------------------

/** v1: image.getPixel(column, row) replaces image.getPixelXY(x, y) */
export function getPixel(image: Image, column: number, row: number): number[] {
  return image.getPixelXY(column, row);
}

/** v1: image.setPixel(column, row, value) replaces image.setPixelXY(x, y, value) */
export function setPixel(
  image: Image,
  column: number,
  row: number,
  value: number[]
): void {
  image.setPixelXY(column, row, value);
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

export interface CropOptions {
  origin: { column: number; row: number };
  width: number;
  height: number;
}

/** v1: image.crop({ origin: {column, row}, width, height }) replaces image.crop({ x, y, width, height }) */
export function crop(image: Image, options: CropOptions): Image {
  return image.crop({
    x: options.origin.column,
    y: options.origin.row,
    width: options.width,
    height: options.height,
  });
}

/** v1: image.rotate(angle) only accepts 90|180|270. Wraps with a 0-degree no-op guard. */
export function rotateRightAngle(
  image: Image,
  angle: 0 | 90 | 180 | 270
): Image {
  if (angle === 0) return image;
  return image.rotate(angle);
}

/** v1: image.transformRotate(angle) replaces image.rotate(arbitraryAngle) */
export function transformRotate(image: Image, angle: number): Image {
  return image.rotate(angle);
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
