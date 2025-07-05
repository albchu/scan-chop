import { RGB } from './types';

/**
 * Calculate the brightness of an RGB color
 * @param color - RGB color values
 * @returns Average of RGB values (0-255)
 */
export const calculateBrightness = (color: RGB): number =>
  (color[0] + color[1] + color[2]) / 3;

/**
 * Create a white-boundary color predicate
 * Stops propagation only when reaching white or near-white pixels
 * @param whiteThreshold - Minimum brightness to consider as white (0-255)
 * @returns Predicate function that returns false for white pixels
 */
export const createWhiteBoundaryPredicate = (
  whiteThreshold: number = 250
): ColorPredicate => {
  let boundaryHits = 0;
  return (target, reference) => {
    const targetBrightness = calculateBrightness(target);
    // Log when we hit potential boundaries
    if (targetBrightness >= whiteThreshold && boundaryHits < 5) {
      console.log(
        `🚧 Hit boundary pixel: RGB(${target.join(', ')}), brightness=${targetBrightness.toFixed(1)}`
      );
      boundaryHits++;
    }
    // Continue flood fill unless we hit a white/near-white pixel
    return targetBrightness < whiteThreshold;
  };
};

// Re-export types for convenience
export type { RGB };
export type ColorPredicate = (target: RGB, reference: RGB) => boolean; 