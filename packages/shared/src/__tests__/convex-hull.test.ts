import { describe, expect, it } from 'vitest';
import { computeConvexHull } from '../convex-hull';

describe('computeConvexHull', () => {
  it('should return empty array for empty input', () => {
    expect(computeConvexHull([])).toEqual([]);
  });

  it('should return single point for single point input', () => {
    const points: [number, number][] = [[5, 5]];
    const hull = computeConvexHull(points);
    expect(hull).toEqual([{ x: 5, y: 5 }]);
  });

  it('should return both points for two points', () => {
    const points: [number, number][] = [[0, 0], [5, 5]];
    const hull = computeConvexHull(points);
    expect(hull).toHaveLength(2);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 5, y: 5 });
  });

  it('should compute hull for triangle', () => {
    const points: [number, number][] = [[0, 0], [5, 0], [2.5, 5]];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(3);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 5, y: 0 });
    expect(hull).toContainEqual({ x: 2.5, y: 5 });
  });

  it('should compute hull for square', () => {
    const points: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(4);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 10, y: 0 });
    expect(hull).toContainEqual({ x: 10, y: 10 });
    expect(hull).toContainEqual({ x: 0, y: 10 });
  });

  it('should exclude interior points', () => {
    const points: [number, number][] = [
      [0, 0], [10, 0], [10, 10], [0, 10], // Square corners
      [5, 5], // Interior point
    ];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 5, y: 5 });
  });

  it('should handle collinear points on edges', () => {
    const points: [number, number][] = [
      [0, 0], [5, 0], [10, 0], // Three points on bottom edge
      [10, 10], [0, 10]
    ];
    const hull = computeConvexHull(points);
    
    // Should exclude middle point on the edge
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 5, y: 0 });
  });

  it('should handle all collinear points', () => {
    const points: [number, number][] = [
      [0, 0], [1, 1], [2, 2], [3, 3], [4, 4]
    ];
    const hull = computeConvexHull(points);
    
    // Should only include endpoints
    expect(hull).toHaveLength(2);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 4, y: 4 });
  });

  it('should compute hull for pentagon', () => {
    const points: [number, number][] = [
      [0, 0],
      [5, -2],
      [8, 3],
      [4, 7],
      [-2, 4]
    ];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(5);
    // All points should be on the hull
    points.forEach(([x, y]) => {
      expect(hull).toContainEqual({ x, y });
    });
  });

  it('should handle negative coordinates', () => {
    const points: [number, number][] = [
      [-5, -5], [5, -5], [5, 5], [-5, 5]
    ];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(4);
    expect(hull).toContainEqual({ x: -5, y: -5 });
    expect(hull).toContainEqual({ x: 5, y: -5 });
    expect(hull).toContainEqual({ x: 5, y: 5 });
    expect(hull).toContainEqual({ x: -5, y: 5 });
  });

  it('should handle duplicate points', () => {
    const points: [number, number][] = [
      [0, 0], [0, 0], // Duplicate
      [10, 0], [10, 10], [0, 10]
    ];
    const hull = computeConvexHull(points);
    
    // Should still produce valid hull
    expect(hull).toHaveLength(4);
  });

  it('should compute hull for random cloud', () => {
    const points: [number, number][] = [
      [3, 4], [5, 2], [1, 7], [8, 1], [2, 6],
      [7, 5], [4, 3], [6, 8], [0, 5], [9, 4]
    ];
    const hull = computeConvexHull(points);
    
    // Hull should have fewer points than input
    expect(hull.length).toBeLessThan(points.length);
    expect(hull.length).toBeGreaterThanOrEqual(3);
    
    // Check that hull points are from original set
    hull.forEach(hullPoint => {
      const found = points.some(([x, y]) => 
        Math.abs(hullPoint.x - x) < 0.0001 && Math.abs(hullPoint.y - y) < 0.0001
      );
      expect(found).toBe(true);
    });
  });

  it('should return hull in counter-clockwise order', () => {
    const points: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const hull = computeConvexHull(points);
    
    // Compute signed area to verify counter-clockwise order
    let signedArea = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      signedArea += hull[i].x * hull[j].y - hull[j].x * hull[i].y;
    }
    
    // Positive area indicates counter-clockwise order
    expect(signedArea).toBeGreaterThan(0);
  });

  it('should handle large number of points', () => {
    const points: [number, number][] = [];
    // Create a circle of points
    const numPoints = 100;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      points.push([
        Math.cos(angle) * 10,
        Math.sin(angle) * 10
      ]);
    }
    
    // Add some interior points
    for (let i = 0; i < 50; i++) {
      points.push([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ]);
    }
    
    const hull = computeConvexHull(points);
    
    // Hull should be approximately the circle perimeter
    expect(hull.length).toBeGreaterThanOrEqual(20);
    expect(hull.length).toBeLessThanOrEqual(numPoints);
  });

  it('should handle floating point coordinates', () => {
    const points: [number, number][] = [
      [0.1, 0.1], [10.5, 0.2], [10.3, 10.7], [0.4, 10.6]
    ];
    const hull = computeConvexHull(points);
    
    expect(hull).toHaveLength(4);
    // Verify all expected points are in hull (with tolerance)
    points.forEach(([x, y]) => {
      const found = hull.some(hp => 
        Math.abs(hp.x - x) < 0.0001 && Math.abs(hp.y - y) < 0.0001
      );
      expect(found).toBe(true);
    });
  });
}); 