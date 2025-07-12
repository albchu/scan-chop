import { BoundingBox, Vector2 } from './types';
import { degreesToRadians } from './geometry';

/**
 * Scale a single point by a scale factor (preserves floating-point precision)
 * @param point - Point to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled point with floating-point precision
 */
export const scaleCoordinatesFloat = (
  point: Vector2,
  scaleFactor: number
): Vector2 => ({
  x: point.x * scaleFactor,
  y: point.y * scaleFactor,
});

/**
 * Scale a single point by a scale factor
 * @param point - Point to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled point
 */
export const scaleCoordinates = (
  point: Vector2,
  scaleFactor: number
): Vector2 => ({
  x: Math.round(point.x * scaleFactor),
  y: Math.round(point.y * scaleFactor),
});

/**
 * Scale an array of points by a scale factor (preserves floating-point precision)
 * @param region - Array of points to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled region with floating-point precision
 */
export const scaleRegionFloat = (
  region: ReadonlyArray<[number, number]>,
  scaleFactor: number
): Array<[number, number]> => {
  return region.map(([x, y]) => [
    x * scaleFactor,
    y * scaleFactor,
  ] as [number, number]);
};

/**
 * Scale an array of points by a scale factor
 * @param region - Array of points to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled region
 */
export const scaleRegion = (
  region: ReadonlyArray<[number, number]>,
  scaleFactor: number
): Array<[number, number]> => {
  return region.map(([x, y]) => [
    Math.round(x * scaleFactor),
    Math.round(y * scaleFactor),
  ] as [number, number]);
};

/**
 * Scale a bounding box by a scale factor
 * @param box - Bounding box to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled bounding box
 */
export const scaleBoundingBox = (
  box: BoundingBox,
  scaleFactor: number
): BoundingBox => ({
  x: box.x * scaleFactor,
  y: box.y * scaleFactor,
  width: box.width * scaleFactor,
  height: box.height * scaleFactor,
  rotation: box.rotation, // Rotation doesn't change with scaling
});

/**
 * Get the four corners of a rotated rectangle (high precision version)
 * @param boundingBox - The bounding box
 * @returns Array of four corner points with floating-point precision
 */
export const transformCornersFloat = (boundingBox: BoundingBox): Vector2[] => {
  const angleRad = degreesToRadians(boundingBox.rotation);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Use high precision calculations
  const corners: Vector2[] = [
    { x: boundingBox.x, y: boundingBox.y },
    { 
      x: boundingBox.x + boundingBox.width * cos, 
      y: boundingBox.y + boundingBox.width * sin 
    },
    {
      x: boundingBox.x + boundingBox.width * cos - boundingBox.height * sin,
      y: boundingBox.y + boundingBox.width * sin + boundingBox.height * cos,
    },
    { 
      x: boundingBox.x - boundingBox.height * sin, 
      y: boundingBox.y + boundingBox.height * cos 
    },
  ];

  return corners;
};

/**
 * Get the four corners of a rotated rectangle
 * @param boundingBox - The bounding box
 * @returns Array of four corner points
 */
export const transformCorners = (boundingBox: BoundingBox): Vector2[] => {
  return transformCornersFloat(boundingBox);
};

/**
 * Calculate axis-aligned bounding box from rotated corners (preserves floating-point precision)
 * @param corners - Array of corner points
 * @param imageWidth - Width constraint for the image
 * @param imageHeight - Height constraint for the image
 * @returns Axis-aligned bounding box coordinates with floating-point precision
 */
export const calculateAxisAlignedBoundsFloat = (
  corners: Vector2[],
  imageWidth?: number,
  imageHeight?: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  
  const minX = Math.max(0, Math.min(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxX = imageWidth 
    ? Math.min(imageWidth, Math.max(...xs))
    : Math.max(...xs);
  const maxY = imageHeight
    ? Math.min(imageHeight, Math.max(...ys))
    : Math.max(...ys);
  
  return { minX, minY, maxX, maxY };
};

/**
 * Calculate axis-aligned bounding box from rotated corners
 * @param corners - Array of corner points
 * @param imageWidth - Width constraint for the image
 * @param imageHeight - Height constraint for the image
 * @returns Axis-aligned bounding box coordinates
 */
export const calculateAxisAlignedBounds = (
  corners: Vector2[],
  imageWidth?: number,
  imageHeight?: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = imageWidth 
    ? Math.min(imageWidth - 1, Math.ceil(Math.max(...xs)))
    : Math.ceil(Math.max(...xs));
  const maxY = imageHeight
    ? Math.min(imageHeight - 1, Math.ceil(Math.max(...ys)))
    : Math.ceil(Math.max(...ys));
  
  return { minX, minY, maxX, maxY };
};

/**
 * Calculate the center point of a bounding box after rotation (high precision)
 * @param boundingBox - The bounding box
 * @returns Center point coordinates with floating-point precision
 */
export const getBoundingBoxCenterFloat = (boundingBox: BoundingBox): Vector2 => {
  const angleRad = degreesToRadians(boundingBox.rotation);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  // Calculate center without premature rounding
  const halfWidth = boundingBox.width / 2;
  const halfHeight = boundingBox.height / 2;
  
  return {
    x: boundingBox.x + halfWidth * cos - halfHeight * sin,
    y: boundingBox.y + halfWidth * sin + halfHeight * cos,
  };
};

/**
 * Calculate the center point of a bounding box after rotation
 * @param boundingBox - The bounding box
 * @returns Center point coordinates
 */
export const getBoundingBoxCenter = (boundingBox: BoundingBox): Vector2 => {
  return getBoundingBoxCenterFloat(boundingBox);
};

/**
 * Translate a bounding box center to new coordinates after cropping
 * @param center - Original center point
 * @param cropX - X coordinate of crop
 * @param cropY - Y coordinate of crop
 * @returns Translated center point
 */
export const translateBoundingBoxCenter = (
  center: Vector2,
  cropX: number,
  cropY: number
): Vector2 => ({
  x: center.x - cropX,
  y: center.y - cropY,
}); 