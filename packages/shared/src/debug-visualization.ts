import { Image } from 'image-js';
import { BoundingBox, Vector2 } from './types';
import { isInBounds, degreesToRadians } from './geometry';

/**
 * Draw a circle on an image using Bresenham's algorithm
 * @param image - Image to draw on
 * @param center - Center point of the circle
 * @param radius - Radius of the circle
 * @param color - RGBA color array
 */
export const drawCircle = (
  image: Image,
  center: Vector2,
  radius: number,
  color: number[]
): void => {
  let x = radius;
  let y = 0;
  let radiusError = 1 - x;

  while (x >= y) {
    // Draw 8 octants
    const points = [
      [center.x + x, center.y + y],
      [center.x + y, center.y + x],
      [center.x - y, center.y + x],
      [center.x - x, center.y + y],
      [center.x - x, center.y - y],
      [center.x - y, center.y - x],
      [center.x + y, center.y - x],
      [center.x + x, center.y - y],
    ];

    for (const [px, py] of points) {
      if (isInBounds(image, px, py)) {
        image.setPixelXY(px, py, color);
      }
    }

    y++;
    if (radiusError < 0) {
      radiusError += 2 * y + 1;
    } else {
      x--;
      radiusError += 2 * (y - x + 1);
    }
  }
};

/**
 * Draw a thick circle by drawing multiple concentric circles
 * @param image - Image to draw on
 * @param center - Center point of the circle
 * @param innerRadius - Inner radius
 * @param outerRadius - Outer radius
 * @param color - RGBA color array
 */
export const drawThickCircle = (
  image: Image,
  center: Vector2,
  innerRadius: number,
  outerRadius: number,
  color: number[]
): void => {
  for (let r = innerRadius; r <= outerRadius; r++) {
    drawCircle(image, center, r, color);
  }
};

/**
 * Draw a line between two points
 * @param image - Image to draw on
 * @param p1 - Start point
 * @param p2 - End point
 * @param color - RGBA color array
 */
export const drawLine = (
  image: Image,
  p1: Vector2,
  p2: Vector2,
  color: number[]
): void => {
  const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(p1.x + (p2.x - p1.x) * t);
    const y = Math.round(p1.y + (p2.y - p1.y) * t);
    
    if (isInBounds(image, x, y)) {
      image.setPixelXY(x, y, color);
    }
  }
};

/**
 * Draw a rectangle (possibly rotated) on an image
 * @param image - Image to draw on
 * @param boundingBox - Bounding box defining the rectangle
 * @param color - RGBA color array
 */
export const drawRectangle = (
  image: Image,
  boundingBox: BoundingBox,
  color: number[]
): void => {
  const angleRad = degreesToRadians(boundingBox.rotation);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const corners = [
    { x: 0, y: 0 },
    { x: boundingBox.width, y: 0 },
    { x: boundingBox.width, y: boundingBox.height },
    { x: 0, y: boundingBox.height },
  ].map((corner) => ({
    x:
      boundingBox.x +
      corner.x * cos -
      corner.y * sin,
    y:
      boundingBox.y +
      corner.x * sin +
      corner.y * cos,
  }));

  // Draw lines between consecutive corners
  for (let i = 0; i < 4; i++) {
    drawLine(image, corners[i], corners[(i + 1) % 4], color);
  }
};

/**
 * Draw a filled square marker
 * @param image - Image to draw on
 * @param center - Center point
 * @param size - Half-size of the square
 * @param color - RGBA color array
 */
export const drawSquareMarker = (
  image: Image,
  center: Vector2,
  size: number,
  color: number[]
): void => {
  for (let dx = -size; dx <= size; dx++) {
    for (let dy = -size; dy <= size; dy++) {
      const px = center.x + dx;
      const py = center.y + dy;
      if (isInBounds(image, px, py)) {
        image.setPixelXY(px, py, color);
      }
    }
  }
};

/**
 * Highlight a region of points on an image
 * @param image - Image to draw on
 * @param points - Array of points to highlight
 * @param color - RGBA color array
 */
export const highlightRegion = (
  image: Image,
  points: ReadonlyArray<[number, number]>,
  color: number[]
): void => {
  for (const [x, y] of points) {
    if (isInBounds(image, x, y)) {
      image.setPixelXY(x, y, color);
    }
  }
};

/**
 * Create a debug image showing various processing results
 * @param baseImage - Base image to overlay debug info on
 * @param options - Debug visualization options
 * @returns New image with debug overlays
 */
export interface DebugImageOptions {
  region?: ReadonlyArray<[number, number]>;
  regionColor?: number[];
  seed?: Vector2;
  seedColor?: number[];
  seedRadius?: { inner: number; outer: number };
  boundingBox?: BoundingBox;
  boundingBoxColor?: number[];
  markers?: Array<{ point: Vector2; color: number[]; size: number }>;
}

export const createDebugImage = (
  baseImage: Image,
  options: DebugImageOptions
): Image => {
  const debugImage = baseImage.clone();
  
  // Draw flood fill region
  if (options.region && options.regionColor) {
    highlightRegion(debugImage, options.region, options.regionColor);
  }
  
  // Draw bounding box
  if (options.boundingBox && options.boundingBoxColor) {
    drawRectangle(debugImage, options.boundingBox, options.boundingBoxColor);
  }
  
  // Draw seed point with circle
  if (options.seed) {
    // Draw circle around seed
    if (options.seedRadius) {
      const circleColor = options.seedColor || [0, 0, 255, 255];
      drawThickCircle(
        debugImage,
        options.seed,
        options.seedRadius.inner,
        options.seedRadius.outer,
        circleColor
      );
    }
    
    // Draw seed point marker on top
    drawSquareMarker(
      debugImage,
      options.seed,
      2,
      options.seedColor || [0, 255, 0, 255]
    );
  }
  
  // Draw additional markers
  if (options.markers) {
    for (const marker of options.markers) {
      drawSquareMarker(
        debugImage,
        marker.point,
        marker.size,
        marker.color
      );
    }
  }
  
  return debugImage;
};

/**
 * Create a composite debug image showing before/after or multiple stages
 * @param images - Array of images to composite
 * @param layout - Layout direction ('horizontal' or 'vertical')
 * @param gap - Gap between images in pixels
 * @returns Composite image
 */
export const createCompositeDebugImage = (
  images: Image[],
  layout: 'horizontal' | 'vertical' = 'horizontal',
  gap: number = 10
): Image => {
  if (images.length === 0) {
    throw new Error('No images provided for composite');
  }
  
  // Calculate dimensions
  const isHorizontal = layout === 'horizontal';
  const totalGap = gap * (images.length - 1);
  
  let width: number;
  let height: number;
  
  if (isHorizontal) {
    width = images.reduce((sum, img) => sum + img.width, 0) + totalGap;
    height = Math.max(...images.map(img => img.height));
  } else {
    width = Math.max(...images.map(img => img.width));
    height = images.reduce((sum, img) => sum + img.height, 0) + totalGap;
  }
  
  // Create composite image
  const composite = new Image(width, height);
  
  // Copy images manually since paste method may not be available
  let offset = 0;
  for (const img of images) {
    const xOffset = isHorizontal ? offset : 0;
    const yOffset = isHorizontal ? 0 : offset;
    
    // Copy pixels from source image to composite
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const targetX = x + xOffset;
        const targetY = y + yOffset;
        
        if (targetX < composite.width && targetY < composite.height) {
          const pixel = img.getPixelXY(x, y);
          composite.setPixelXY(targetX, targetY, pixel);
        }
      }
    }
    
    offset += isHorizontal ? img.width + gap : img.height + gap;
  }
  
  return composite;
}; 