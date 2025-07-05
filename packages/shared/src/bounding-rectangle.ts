import { BoundingBox, ProcessingConfig, Vector2 } from './types';
import { computeConvexHull } from './convex-hull';
import { degreesToRadians, normalizeRotation, rotatePoint } from './geometry';
import { chooseBestAngle, computePCAOrientation, refineAngle } from './orientation';

/**
 * Find the minimum area bounding rectangle using rotating calipers
 * @param points - Array of points to bound
 * @param minArea - Minimum acceptable area
 * @param config - Processing configuration for advanced options
 * @returns Bounding frame with position, size, and rotation
 */
export const findMinimalBoundingRectangle = (
  points: ReadonlyArray<[number, number]>,
  minArea = 100,
  config: ProcessingConfig = {}
): BoundingBox => {
  if (points.length < 3) {
    throw new Error('Not enough points to compute bounding rectangle');
  }

  console.log(`🔍 Computing bounding box for ${points.length} points`);

  const hull = computeConvexHull(points);
  console.log(`🔸 Convex hull has ${hull.length} vertices`);

  if (hull.length < 3) {
    // Degenerate case - all points are collinear
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      rotation: 0,
    };
  }

  let minimalArea = Infinity;
  let bestRectangle = { center: { x: 0, y: 0 }, width: 0, height: 0, angle: 0 };
  let bestEdgeIndex = -1;

  // Test each edge of the convex hull
  for (let i = 0; i < hull.length; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % hull.length];

    const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const rotatedHull = hull.map((p) => rotatePoint(p, -edgeAngle));

    const xs = rotatedHull.map((p) => p.x);
    const ys = rotatedHull.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;

    if (area < minimalArea) {
      minimalArea = area;
      bestEdgeIndex = i;
      const center = rotatePoint(
        { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        edgeAngle
      );
      bestRectangle = {
        center,
        width,
        height,
        angle: (edgeAngle * 180) / Math.PI,
      };
    }
  }

  console.log(
    `🔄 Minimal rectangle: ${bestRectangle.width.toFixed(1)}×${bestRectangle.height.toFixed(1)}, rotation=${bestRectangle.angle.toFixed(1)}°`
  );
  console.log(
    `📐 Best edge: ${bestEdgeIndex}/${hull.length - 1}, from (${hull[bestEdgeIndex].x.toFixed(0)}, ${hull[bestEdgeIndex].y.toFixed(0)}) to (${hull[(bestEdgeIndex + 1) % hull.length].x.toFixed(0)}, ${hull[(bestEdgeIndex + 1) % hull.length].y.toFixed(0)})`
  );

  if (minimalArea < minArea) {
    throw new Error(`Region too small: ${minimalArea.toFixed(0)} < ${minArea}`);
  }

  // Apply PCA if enabled
  let workingAngle = bestRectangle.angle;
  if (config.usePca) {
    const pcaAngle = computePCAOrientation(points);
    const pointsAsVector2 = points.map(([x, y]) => ({ x, y }));
    workingAngle = chooseBestAngle(
      bestRectangle.angle,
      pcaAngle,
      pointsAsVector2,
      bestRectangle.center
    );
    console.log(`📊 After PCA: workingAngle=${workingAngle.toFixed(2)}°`);
  }

  // Apply angle refinement if enabled
  let finalAngle = workingAngle;
  if (config.enableAngleRefine) {
    const pointsAsVector2 = points.map(([x, y]) => ({ x, y }));
    finalAngle = refineAngle(
      pointsAsVector2,
      bestRectangle.center,
      workingAngle,
      config.angleRefineWindow || 3,
      config.angleRefineIterations || 10
    );
    console.log(`🎯 After refinement: finalAngle=${finalAngle.toFixed(2)}°`);
  }

  console.log(
    `🔄 Before normalization: angle=${finalAngle.toFixed(2)}°, dimensions=${bestRectangle.width.toFixed(1)}×${bestRectangle.height.toFixed(1)}`
  );

  // Normalize rotation to smallest absolute value
  const normalized = normalizeRotation(
    finalAngle,
    bestRectangle.width,
    bestRectangle.height
  );

  // Convert from center-based to corner-based representation
  const angleRad = degreesToRadians(normalized.rotation);
  const halfDiagonal = rotatePoint(
    { x: -normalized.width / 2, y: -normalized.height / 2 },
    angleRad
  );

  return {
    x: bestRectangle.center.x + halfDiagonal.x,
    y: bestRectangle.center.y + halfDiagonal.y,
    width: normalized.width,
    height: normalized.height,
    rotation: normalized.rotation,
  };
}; 