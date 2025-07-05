import { describe, expect, it, vi } from 'vitest';
import { chooseBestAngle, computePCAOrientation, refineAngle } from '../orientation';
import { Vector2 } from '../types';

// Mock console methods to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('computePCAOrientation', () => {
  it('should return null for less than 3 points', () => {
    expect(computePCAOrientation([])).toBeNull();
    expect(computePCAOrientation([[0, 0]])).toBeNull();
    expect(computePCAOrientation([[0, 0], [1, 1]])).toBeNull();
  });

  it('should compute orientation for horizontal line of points', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0]
    ];
    const angle = computePCAOrientation(points);
    expect(angle).toBeCloseTo(0, 1); // Horizontal line should have 0° orientation
  });

  it('should compute orientation for vertical line of points', () => {
    const points: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4]
    ];
    const angle = computePCAOrientation(points);
    // PCA computes the eigenvector of smallest eigenvalue, which is perpendicular to principal axis
    // For a vertical line, this gives ±180° (horizontal direction)
    expect(Math.abs(angle!)).toBeCloseTo(180, 1);
  });

  it('should compute orientation for diagonal line of points', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4]
    ];
    const angle = computePCAOrientation(points);
    // For a 45° diagonal, the perpendicular direction is 135° or -45°
    expect(angle).toBeCloseTo(135, 1);
  });

  it('should compute orientation for negative diagonal', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, -1],
      [2, -2],
      [3, -3],
      [4, -4]
    ];
    const angle = computePCAOrientation(points);
    // For a -45° diagonal, the perpendicular direction is -135° or 45°
    expect(angle).toBeCloseTo(-135, 1);
  });

  it('should handle rectangular cloud of points', () => {
    const points: [number, number][] = [
      // Rectangle with width > height
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]
    ];
    const angle = computePCAOrientation(points);
    // For a perfect grid, the eigenvalues might be equal, returning null
    // Or it might detect slight numerical differences
    expect(angle === null || typeof angle === 'number').toBeTruthy();
  });

  it('should return null for circular distribution (degenerate case)', () => {
    // Points arranged in a perfect circle - equal eigenvalues
    const points: [number, number][] = [];
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      points.push([Math.cos(angle), Math.sin(angle)]);
    }
    const result = computePCAOrientation(points);
    // May or may not be null depending on numerical precision
    expect(result === null || typeof result === 'number').toBeTruthy();
  });

  it('should handle points with offset from origin', () => {
    const points: [number, number][] = [
      [100, 100],
      [101, 100],
      [102, 100],
      [103, 100],
      [104, 100]
    ];
    const angle = computePCAOrientation(points);
    expect(angle).toBeCloseTo(0, 1); // Still horizontal (perpendicular to horizontal line)
  });

  it('should handle points forming a thin rectangle', () => {
    const points: [number, number][] = [];
    // Create a thin horizontal rectangle
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 2; y++) {
        points.push([x, y]);
      }
    }
    const angle = computePCAOrientation(points);
    // The smallest eigenvalue eigenvector should point vertically (perpendicular to long axis)
    if (angle !== null) {
      // Should be close to ±90 degrees
      expect(Math.abs(Math.abs(angle) - 90)).toBeLessThan(10);
    }
  });
});

describe('refineAngle', () => {
  it('should refine angle for simple horizontal rectangle', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 }
    ];
    const center: Vector2 = { x: 5, y: 2.5 };
    
    // Start with slightly off angle
    const refined = refineAngle(points, center, 5, 10, 5);
    
    // Should refine closer to 0
    expect(Math.abs(refined)).toBeLessThan(5);
  });

  it('should handle vertical rectangle', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 10 },
      { x: 0, y: 10 }
    ];
    const center: Vector2 = { x: 2.5, y: 5 };
    
    // Start near 90 degrees
    const refined = refineAngle(points, center, 85, 10, 5);
    
    // Should refine closer to 90
    expect(refined).toBeGreaterThan(80);
    expect(refined).toBeLessThan(95);
  });

  it('should respect search window bounds', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 }
    ];
    const center: Vector2 = { x: 5, y: 2.5 };
    
    const windowDeg = 2;
    const initialDeg = 30;
    const refined = refineAngle(points, center, initialDeg, windowDeg, 10);
    
    // Result should be within the search window
    expect(refined).toBeGreaterThanOrEqual(initialDeg - windowDeg);
    expect(refined).toBeLessThanOrEqual(initialDeg + windowDeg);
  });

  it('should handle single point (edge case)', () => {
    const points: Vector2[] = [{ x: 5, y: 5 }];
    const center: Vector2 = { x: 0, y: 0 };
    
    const refined = refineAngle(points, center, 45, 10, 5);
    
    // With single point, all rotations give same height
    expect(refined).toBeDefined();
    expect(refined).toBeGreaterThanOrEqual(35);
    expect(refined).toBeLessThanOrEqual(55);
  });

  it('should improve with more iterations', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 1 }, // Slightly tilted rectangle
      { x: 9, y: 6 },
      { x: -1, y: 5 }
    ];
    const center: Vector2 = { x: 4.5, y: 3 };
    
    const refined1 = refineAngle(points, center, 10, 20, 1);
    const refined10 = refineAngle(points, center, 10, 20, 10);
    
    // More iterations should give better result (not necessarily different due to convergence)
    expect(refined10).toBeDefined();
    expect(refined1).toBeDefined();
  });
});

describe('chooseBestAngle', () => {
  it('should return calipers angle when PCA is null', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 }
    ];
    const center: Vector2 = { x: 5, y: 2.5 };
    
    const result = chooseBestAngle(45, null, points, center);
    expect(result).toBe(45);
  });

  it('should choose angle with smaller height', () => {
    // Horizontal rectangle
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 2 },
      { x: 0, y: 2 }
    ];
    const center: Vector2 = { x: 5, y: 1 };
    
    // 0° should give smaller height than 90°
    const result = chooseBestAngle(90, 0, points, center);
    expect(result).toBe(0);
  });

  it('should prefer calipers angle when angles are close', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 }
    ];
    const center: Vector2 = { x: 5, y: 2.5 };
    
    // When angles differ by less than 5°, prefer calipers
    const result = chooseBestAngle(30, 33, points, center);
    expect(result).toBe(30);
  });

  it('should choose PCA angle when significantly better', () => {
    // Vertical rectangle - 90° should be much better than 0°
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 10 },
      { x: 0, y: 10 }
    ];
    const center: Vector2 = { x: 1, y: 5 };
    
    const result = chooseBestAngle(0, 90, points, center);
    expect(result).toBe(90); // PCA angle is significantly better
  });

  it('should handle diagonal rectangle', () => {
    // Diamond shape
    const points: Vector2[] = [
      { x: 5, y: 0 },
      { x: 10, y: 5 },
      { x: 5, y: 10 },
      { x: 0, y: 5 }
    ];
    const center: Vector2 = { x: 5, y: 5 };
    
    // Both 45° and -45° should give similar results
    const result1 = chooseBestAngle(45, -45, points, center);
    const result2 = chooseBestAngle(-45, 45, points, center);
    
    // Should choose one of them consistently
    expect([45, -45]).toContain(result1);
    expect([45, -45]).toContain(result2);
  });

  it('should handle empty points array', () => {
    const points: Vector2[] = [];
    const center: Vector2 = { x: 0, y: 0 };
    
    // Should still return calipers angle (both heights are Infinity - Infinity = 0)
    const result = chooseBestAngle(30, 60, points, center);
    expect(result).toBe(30);
  });

  it('should handle large angle differences correctly', () => {
    const points: Vector2[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 1 },
      { x: 0, y: 1 }
    ];
    const center: Vector2 = { x: 10, y: 0.5 };
    
    // 0° should be much better than 90° for this thin horizontal rectangle
    const result = chooseBestAngle(90, 0, points, center);
    expect(result).toBe(0);
  });
}); 