import { Image } from 'image-js';
import { Vector2, RGB } from './types';
import { ColorPredicate } from './color';
import { isInBounds } from './geometry';

/** Configuration for flood fill algorithm */
export type FloodFillConfig = {
  step?: number;
  maxPixels?: number;
};

/**
 * Perform flood fill to find connected regions of similar color
 * @param image - Source image
 * @param seed - Starting point
 * @param predicate - Function to determine if pixel should be included
 * @param config - Algorithm configuration
 * @param downsampleFactor - Factor by which the image was downsampled (1.0 = no downsampling)
 * @returns Array of points in the filled region (in original image coordinates)
 */
export const floodFill = (
  image: Image,
  seed: Vector2,
  predicate: ColorPredicate,
  config: FloodFillConfig = {},
  downsampleFactor: number = 1.0
): ReadonlyArray<[number, number]> => {
  const { step = 1, maxPixels = 500000 } = config;

  // Enforce step = 1 to avoid visited array indexing issues
  if (step !== 1) {
    console.warn(
      '⚠️ Step > 1 is not supported with current visited array implementation. Using step = 1.'
    );
  }
  const actualStep = 1;

  const { width, height } = image;

  // Round seed coordinates only when needed for pixel access
  const seedX = Math.round(seed.x);
  const seedY = Math.round(seed.y);

  if (!isInBounds(image, seedX, seedY)) {
    throw new Error('Seed point out of image bounds');
  }

  const seedColor = image
    .getPixelXY(seedX, seedY)
    .slice(0, 3) as unknown as RGB;
  const seedBrightness = (seedColor[0] + seedColor[1] + seedColor[2]) / 3;

  console.log(
    `🎨 Seed pixel: RGB(${seedColor.join(', ')}), brightness: ${seedBrightness.toFixed(1)}`
  );

  if (seedBrightness > 200) {
    console.log(
      `⚠️ Warning: Seed pixel is very bright (${seedBrightness.toFixed(1)})`
    );
  }

  const visited = new Uint8Array(width * height);
  const queue: Vector2[] = [{ x: seedX, y: seedY }];
  const region: [number, number][] = [];

  // Use 8 directions for better connectivity
  const directions = [
    [-actualStep, 0],
    [actualStep, 0],
    [0, -actualStep],
    [0, actualStep],
    [-actualStep, -actualStep],
    [actualStep, -actualStep],
    [-actualStep, actualStep],
    [actualStep, actualStep],
  ];

  let pixelsChecked = 0;

  while (queue.length > 0) {
    // Check if we've exceeded the maximum pixels limit
    if (region.length >= maxPixels) {
      console.warn(
        `⚠️ Flood fill terminated: reached maximum pixel limit (${maxPixels}). Region may be incomplete.`
      );
      throw new Error(
        `Region too large: exceeded ${maxPixels} pixels. Consider increasing maxPixels or using a more restrictive color predicate.`
      );
    }

    const { x, y } = queue.shift()!;
    const idx = y * width + x;

    if (visited[idx]) continue;
    visited[idx] = 1;
    pixelsChecked++;

    const currentColor = image.getPixelXY(x, y).slice(0, 3) as unknown as RGB;
    if (!predicate(currentColor, seedColor)) continue;

    // Store points in original image coordinates with floating-point precision
    const originalX = x / downsampleFactor;
    const originalY = y / downsampleFactor;
    region.push([originalX, originalY]);

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (isInBounds(image, nx, ny) && !visited[ny * width + nx]) {
        queue.push({ x: nx, y: ny });
      }
    }
  }

  console.log(
    `🔍 Flood fill: checked ${pixelsChecked} pixels, found ${region.length} pixels`
  );

  if (region.length === 0) {
    throw new Error('No region found');
  }

  return region;
}; 