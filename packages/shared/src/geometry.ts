import { Image } from 'image-js';
import { Vector2 } from './types';

/**
 * Check if a point is within image bounds
 * @param image - The image to check against
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if point is within bounds
 */
export const isInBounds = (image: Image, x: number, y: number): boolean =>
  x >= 0 && x < image.width && y >= 0 && y < image.height;

/**
 * Rotate a point around the origin
 * @param point - Point to rotate
 * @param angleRad - Rotation angle in radians
 * @returns Rotated point
 */
export const rotatePoint = (point: Vector2, angleRad: number): Vector2 => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Normalize angle to -180 to 180 range
 * @param degrees - Angle in degrees
 * @returns Normalized angle
 */
export const normalizeAngle = (degrees: number): number => {
  let angle = degrees;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

/**
 * Normalize rotation to smallest absolute value (-45 to 45 range)
 * while maintaining the same rectangle orientation
 * @param rotation - Rotation angle in degrees
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Normalized rotation and possibly swapped dimensions
 */
export const normalizeRotation = (
  rotation: number,
  width: number,
  height: number
): { rotation: number; width: number; height: number } => {
  let normalizedRotation = normalizeAngle(rotation);
  let finalWidth = width;
  let finalHeight = height;

  console.log(
    `🔄 normalizeRotation: input rotation=${rotation.toFixed(2)}°, normalized=${normalizedRotation.toFixed(2)}°`
  );
  console.log(
    `📐 normalizeRotation: input dimensions=${width.toFixed(1)}×${height.toFixed(1)}`
  );

  // Handle angles near ±180° by converting to near 0°
  if (normalizedRotation > 135 || normalizedRotation < -135) {
    console.log(`🔄 normalizeRotation: angle near ±180°, flipping by 180°`);
    normalizedRotation = normalizeAngle(normalizedRotation + 180);
  }

  // Convert angles close to ±90° to smaller angles by swapping width/height
  // Note: Adding ±90° keeps the edge set identical but gives a smaller absolute angle
  // This ensures we always work with rotations in the -45° to 45° range
  if (normalizedRotation > 45) {
    console.log(
      `🔄 normalizeRotation: angle > 45°, rotating by -90° and swapping dimensions`
    );
    normalizedRotation -= 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  } else if (normalizedRotation < -45) {
    console.log(
      `🔄 normalizeRotation: angle < -45°, rotating by +90° and swapping dimensions`
    );
    normalizedRotation += 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  }

  console.log(
    `🔄 normalizeRotation: final rotation=${normalizedRotation.toFixed(2)}°, dimensions=${finalWidth.toFixed(1)}×${finalHeight.toFixed(1)}`
  );

  return {
    rotation: normalizedRotation,
    width: finalWidth,
    height: finalHeight,
  };
}; 