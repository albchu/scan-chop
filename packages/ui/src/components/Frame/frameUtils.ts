// Helper utilities for Frame component

/**
 * Creates a transform string from position and rotation values
 */
export const createTransformString = (x: number, y: number, rotation: number): string => {
  return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
};

/**
 * Calculates the moveable zoom value based on total scale
 * When totalScale is small (zoomed out), we want larger handles (higher zoom)
 * When totalScale is large (zoomed in), we want smaller handles (lower zoom)
 */
export const calculateMoveableZoom = (totalScale: number): number => {
  const inverseZoom = 1 / totalScale;
  // Clamp range to prevent handles from being too small or too large
  return Math.max(0.5, Math.min(16, inverseZoom));
};

/**
 * Adds grabbing cursor class and removes grab cursor
 */
export const addGrabbingCursor = (target: HTMLElement): void => {
  target.classList.add('cursor-grabbing');
  target.classList.remove('cursor-grab');
};

/**
 * Removes grabbing cursor class and adds grab cursor
 */
export const removeGrabbingCursor = (target: HTMLElement): void => {
  target.classList.remove('cursor-grabbing');
  target.classList.add('cursor-grab');
};

/**
 * Formats size display string
 * If scaleFactor is provided, displays original image dimensions
 */
export const formatSizeDisplay = (width: number, height: number, scaleFactor?: number): string => {
  if (scaleFactor) {
    // Show original dimensions
    const originalWidth = Math.round(width * scaleFactor);
    const originalHeight = Math.round(height * scaleFactor);
    return `${originalWidth} × ${originalHeight}`;
  }
  return `${Math.round(width)} × ${Math.round(height)}`;
};

/**
 * Formats rotation display string
 */
export const formatRotationDisplay = (rotation: number): string => {
  return `${rotation.toFixed(1)}°`;
};

/**
 * Default render directions for Moveable resize handles
 */
export const RENDER_DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']; 