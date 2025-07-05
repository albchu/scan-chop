import { Vector2 } from './types';

/**
 * Compute the convex hull of a set of points
 * @param points - Array of 2D points
 * @returns Vertices of the convex hull in counter-clockwise order
 */
export const computeConvexHull = (
  points: ReadonlyArray<[number, number]>
): Vector2[] => {
  const pts = points
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));

  if (pts.length <= 1) return pts;

  const cross = (o: Vector2, a: Vector2, b: Vector2): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const buildHull = (points: Vector2[]): Vector2[] => {
    const hull: Vector2[] = [];
    for (const p of points) {
      // Note: We use cross <= 0 to remove collinear points, keeping only the extreme vertices
      // This creates a strictly convex hull, which is fine for minimum-area rectangle calculation
      while (
        hull.length >= 2 &&
        cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0
      ) {
        hull.pop();
      }
      hull.push(p);
    }
    hull.pop(); // Remove last point as it's repeated
    return hull;
  };

  const lower = buildHull(pts);
  const upper = buildHull([...pts].reverse());

  return [...lower, ...upper];
}; 