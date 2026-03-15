import { Image } from 'image-js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { RGB } from '@workspace/shared';

const DEFAULT_DARK: RGB = [80, 80, 80];
const WHITE: RGB = [255, 255, 255];

/**
 * Create a solid white page representing a blank scanner bed.
 */
export function createWhitePage(width: number, height: number): Image {
  const image = new Image(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      image.setPixelXY(x, y, [WHITE[0], WHITE[1], WHITE[2], 255]);
    }
  }
  return image;
}

/**
 * Paint a solid filled rectangle onto an existing image (mutates in place).
 */
export function fillRect(
  image: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB = DEFAULT_DARK
): void {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (col >= 0 && col < image.width && row >= 0 && row < image.height) {
        image.setPixelXY(col, row, [color[0], color[1], color[2], 255]);
      }
    }
  }
}

/**
 * Create a white page with a single dark rectangle at known coordinates.
 */
export function createPageWithRectangle(
  pageW: number,
  pageH: number,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  color: RGB = DEFAULT_DARK
): Image {
  const image = createWhitePage(pageW, pageH);
  fillRect(image, rectX, rectY, rectW, rectH, color);
  return image;
}

interface RectSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: RGB;
}

/**
 * Create a white page with multiple dark rectangles.
 */
export function createPageWithRectangles(
  pageW: number,
  pageH: number,
  rects: RectSpec[]
): Image {
  const image = createWhitePage(pageW, pageH);
  for (const rect of rects) {
    fillRect(image, rect.x, rect.y, rect.w, rect.h, rect.color ?? DEFAULT_DARK);
  }
  return image;
}

/**
 * Create a temp directory for tests that need filesystem access.
 */
export async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'scan-chop-test-'));
}

/**
 * Remove a temp directory and all its contents.
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}
