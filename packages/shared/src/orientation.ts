import { Vector2 } from './types';
import { normalizeAngle } from './geometry';

/**
 * Compute the principal axis orientation using PCA
 * @param points - Array of points to analyze
 * @returns Angle in degrees of the principal axis
 */
export const computePCAOrientation = (
  points: ReadonlyArray<[number, number]>
): number | null => {
  if (points.length < 3) return null;

  // Compute mean
  let sx = 0,
    sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const n = points.length;
  const mx = sx / n;
  const my = sy / n;

  // Compute covariance matrix elements
  let sxx = 0,
    sxy = 0,
    syy = 0;
  for (const [x, y] of points) {
    const dx = x - mx;
    const dy = y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  // Compute eigenvalues and eigenvectors
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const discriminant = (trace * trace) / 4 - det;

  if (discriminant < 0) {
    console.warn('⚠️ PCA: Negative discriminant, falling back to calipers');
    return null;
  }

  // Smallest eigenvalue
  const lambda = trace / 2 - Math.sqrt(discriminant);

  // Corresponding eigenvector
  const vx = lambda - syy;
  const vy = sxy;

  // Handle degenerate case (circular or no clear orientation)
  if (Math.abs(vx) < 1e-10 && Math.abs(vy) < 1e-10) {
    console.warn(
      '⚠️ PCA: Degenerate case (equal eigenvalues), falling back to calipers'
    );
    return null;
  }

  const pcaAngle = (Math.atan2(vy, vx) * 180) / Math.PI;
  console.log(`📊 PCA orientation: ${pcaAngle.toFixed(2)}°`);
  return pcaAngle;
};

/**
 * Refine the rotation angle to minimize the projected bounding box height
 * @param points - Points to analyze
 * @param center - Center point of rotation
 * @param initialDeg - Initial angle estimate in degrees
 * @param windowDeg - Search window size in degrees
 * @param iterations - Number of refinement iterations
 * @returns Refined angle in degrees
 */
export const refineAngle = (
  points: ReadonlyArray<Vector2>,
  center: Vector2,
  initialDeg: number,
  windowDeg: number = 3,
  iterations: number = 10
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  let lo = initialDeg - windowDeg;
  let hi = initialDeg + windowDeg;

  const computeHeight = (deg: number): number => {
    const a = toRad(deg);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      // Rotate point around center
      const y = dx * sin + dy * cos;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return maxY - minY;
  };

  // Golden section search
  for (let i = 0; i < iterations; i++) {
    const m1 = lo + (hi - lo) * 0.382;
    const m2 = lo + (hi - lo) * 0.618;
    if (computeHeight(m1) < computeHeight(m2)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }

  const refined = (lo + hi) / 2;
  console.log(
    `🎯 Angle refinement: ${initialDeg.toFixed(2)}° → ${refined.toFixed(2)}° (Δ=${(refined - initialDeg).toFixed(2)}°)`
  );
  return refined;
};

/**
 * Choose the best angle between calipers and PCA based on resulting bounding height
 * @param angleCalipersDeg - Angle from rotating calipers
 * @param anglePcaDeg - Angle from PCA (may be null)
 * @param points - Points to analyze
 * @param center - Center point for rotation
 * @returns Best angle in degrees
 */
export const chooseBestAngle = (
  angleCalipersDeg: number,
  anglePcaDeg: number | null,
  points: ReadonlyArray<Vector2>,
  center: Vector2
): number => {
  if (anglePcaDeg === null) {
    return angleCalipersDeg;
  }

  // Compute heights for both angles
  const computeHeight = (deg: number): number => {
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const y = dx * sin + dy * cos;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return maxY - minY;
  };

  const heightCalipers = computeHeight(angleCalipersDeg);
  const heightPca = computeHeight(anglePcaDeg);

  // Choose angle that gives smaller height
  const angleDiff = Math.abs(normalizeAngle(angleCalipersDeg - anglePcaDeg));

  if (angleDiff > 5 && heightPca < heightCalipers) {
    console.log(
      `📊 Using PCA angle (height: ${heightPca.toFixed(1)} < ${heightCalipers.toFixed(1)})`
    );
    return anglePcaDeg;
  } else {
    console.log(
      `📐 Using calipers angle (height: ${heightCalipers.toFixed(1)})`
    );
    return angleCalipersDeg;
  }
}; 