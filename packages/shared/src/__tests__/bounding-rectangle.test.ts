import { describe, expect, it, vi } from 'vitest';
import { findMinimalBoundingRectangle } from '../bounding-rectangle';
import type { ProcessingConfig, BoundingBox } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('findMinimalBoundingRectangle', () => {
  it('should throw error for less than 3 points', () => {
    expect(() => findMinimalBoundingRectangle([])).toThrow('Not enough points');
    expect(() => findMinimalBoundingRectangle([[0, 0]])).toThrow('Not enough points');
    expect(() => findMinimalBoundingRectangle([[0, 0], [1, 1]])).toThrow('Not enough points');
  });

  it('should compute bounding rectangle for axis-aligned rectangle', () => {
    const points: [number, number][] = [
      [0, 0], [10, 0], [10, 5], [0, 5],
      // Add some interior points
      [5, 2.5], [3, 3], [7, 2]
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.width).toBeCloseTo(10, 1);
    expect(result.height).toBeCloseTo(5, 1);
    expect(Math.abs(result.rotation)).toBeCloseTo(0, 1);
  });

  it('should compute bounding rectangle for rotated square', () => {
    // 45-degree rotated square
    const points: [number, number][] = [
      [5, 0],   // Top
      [10, 5],  // Right
      [5, 10],  // Bottom
      [0, 5]    // Left
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    // Should detect 45-degree rotation (normalized to -45 to 45 range)
    expect(Math.abs(result.rotation)).toBeCloseTo(45, 1);
    
    // Width and height should be equal for a square
    const sideLength = Math.sqrt(50); // Distance from center to corner
    expect(result.width).toBeCloseTo(sideLength, 1);
    expect(result.height).toBeCloseTo(sideLength, 1);
  });

  it('should handle collinear points', () => {
    const points: [number, number][] = [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]
    ];
    
    const result = findMinimalBoundingRectangle(points);
    
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.width).toBeCloseTo(5, 1);
    expect(result.height).toBeCloseTo(0, 1);
    expect(result.rotation).toBe(0);
  });

  it('should throw error if area is too small', () => {
    const points: [number, number][] = [
      [0, 0], [1, 0], [0.5, 0.5]
    ];
    
    expect(() => findMinimalBoundingRectangle(points, 100)).toThrow('Region too small');
  });

  it('should respect minArea parameter', () => {
    const points: [number, number][] = [
      [0, 0], [10, 0], [10, 10], [0, 10]
    ];
    
    // Area is 100, should pass with minArea=100
    const result = findMinimalBoundingRectangle(points, 100);
    expect(result).toBeDefined();
    
    // Should fail with minArea=101
    expect(() => findMinimalBoundingRectangle(points, 101)).toThrow('Region too small');
  });

  it('should handle thin horizontal rectangle', () => {
    const points: [number, number][] = [
      [0, 0], [20, 0], [20, 2], [0, 2],
      // Interior points
      [5, 1], [10, 1], [15, 1]
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 40
    
    expect(result.width).toBeCloseTo(20, 1);
    expect(result.height).toBeCloseTo(2, 1);
    expect(Math.abs(result.rotation)).toBeCloseTo(0, 1);
  });

  it('should handle thin vertical rectangle', () => {
    const points: [number, number][] = [
      [0, 0], [2, 0], [2, 20], [0, 20],
      // Interior points
      [1, 5], [1, 10], [1, 15]
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 40
    
    // Due to normalization, width should be larger dimension
    expect(Math.max(result.width, result.height)).toBeCloseTo(20, 1);
    expect(Math.min(result.width, result.height)).toBeCloseTo(2, 1);
  });

  it('should use PCA when enabled', () => {
    const points: [number, number][] = [];
    // Create elongated cloud of points
    for (let i = 0; i < 50; i++) {
      const x = i * 0.2;
      const y = i * 0.1 + (Math.random() - 0.5) * 0.5;
      points.push([x, y]);
    }
    
    const config: ProcessingConfig = { usePca: true };
    const result = findMinimalBoundingRectangle(points, 1, config); // Lower minArea
    
    expect(result).toBeDefined();
    // Should detect the diagonal orientation
    expect(Math.abs(result.rotation)).toBeGreaterThan(0);
  });

  it('should refine angle when enabled', () => {
    // Slightly rotated rectangle
    const angle = 3 * Math.PI / 180; // 3 degrees
    const points: [number, number][] = [];
    
    // Create rotated rectangle points
    for (let x = 0; x <= 20; x += 2) {
      for (let y = 0; y <= 5; y += 1) {
        const rx = x * Math.cos(angle) - y * Math.sin(angle);
        const ry = x * Math.sin(angle) + y * Math.cos(angle);
        points.push([rx, ry]);
      }
    }
    
    const configNoRefine: ProcessingConfig = { enableAngleRefine: false };
    const configWithRefine: ProcessingConfig = { 
      enableAngleRefine: true,
      angleRefineWindow: 5,
      angleRefineIterations: 10
    };
    
    const resultNoRefine = findMinimalBoundingRectangle(points, 10, configNoRefine);
    const resultWithRefine = findMinimalBoundingRectangle(points, 10, configWithRefine);
    
    // Both should detect rotation, but refined version might be more accurate
    expect(Math.abs(resultNoRefine.rotation)).toBeGreaterThan(1);
    expect(Math.abs(resultWithRefine.rotation)).toBeGreaterThan(1);
  });

  it('should normalize rotation to -45 to 45 range', () => {
    // Create rectangle rotated 70 degrees
    const angle = 70 * Math.PI / 180;
    const points: [number, number][] = [];
    
    const corners = [[0, 0], [10, 0], [10, 5], [0, 5]];
    corners.forEach(([x, y]) => {
      const rx = x * Math.cos(angle) - y * Math.sin(angle);
      const ry = x * Math.sin(angle) + y * Math.cos(angle);
      points.push([rx, ry]);
    });
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    // Should normalize to -20 degrees with swapped dimensions
    expect(result.rotation).toBeCloseTo(-20, 1);
    // Dimensions should be swapped
    expect(result.width).toBeCloseTo(5, 1);
    expect(result.height).toBeCloseTo(10, 1);
  });

  it('should handle negative coordinates', () => {
    const points: [number, number][] = [
      [-10, -5], [0, -5], [0, 0], [-10, 0],
      // Interior points
      [-5, -2.5], [-3, -3], [-7, -2]
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    expect(result.x).toBeCloseTo(-10, 1);
    expect(result.y).toBeCloseTo(-5, 1);
    expect(result.width).toBeCloseTo(10, 1);
    expect(result.height).toBeCloseTo(5, 1);
  });

  it('should handle large point clouds', () => {
    const points: [number, number][] = [];
    
    // Create circle of points
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * 2 * Math.PI;
      points.push([
        Math.cos(angle) * 10,
        Math.sin(angle) * 5
      ]);
    }
    
    // Add interior points
    for (let i = 0; i < 200; i++) {
      points.push([
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10
      ]);
    }
    
    const result = findMinimalBoundingRectangle(points, 10);
    
    // Should bound the ellipse (allowing small tolerance for random points)
    expect(result.width).toBeGreaterThanOrEqual(19.9);
    expect(result.height).toBeGreaterThanOrEqual(9.9);
  });

  it('should handle floating point precision', () => {
    const points: [number, number][] = [
      [0.1, 0.1], [10.1, 0.1], [10.1, 5.1], [0.1, 5.1]
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    expect(result.x).toBeCloseTo(0.1, 1);
    expect(result.y).toBeCloseTo(0.1, 1);
    expect(result.width).toBeCloseTo(10, 1);
    expect(result.height).toBeCloseTo(5, 1);
  });

  it('should compute correct position for rotated rectangles', () => {
    // 45-degree rotated square centered at origin
    const points: [number, number][] = [
      [0, -5],  // Top
      [5, 0],   // Right
      [0, 5],   // Bottom
      [-5, 0]   // Left
    ];
    
    const result = findMinimalBoundingRectangle(points, 10); // Area = 50
    
    // The corner position should be calculated correctly
    const expectedSide = Math.sqrt(50);
    expect(result.width).toBeCloseTo(expectedSide, 1);
    expect(result.height).toBeCloseTo(expectedSide, 1);
    
    // Check that the bounding box actually contains all points
    points.forEach(([px, py]) => {
      // Transform point to bounding box coordinates
      const angle = -result.rotation * Math.PI / 180;
      const dx = px - result.x;
      const dy = py - result.y;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      
      // Point should be within bounds (with small tolerance)
      expect(localX).toBeGreaterThanOrEqual(-0.1);
      expect(localX).toBeLessThanOrEqual(result.width + 0.1);
      expect(localY).toBeGreaterThanOrEqual(-0.1);
      expect(localY).toBeLessThanOrEqual(result.height + 0.1);
    });
  });
}); 