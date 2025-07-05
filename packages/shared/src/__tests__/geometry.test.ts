import { describe, expect, it, vi } from 'vitest';
import { Image } from 'image-js';
import {
  degreesToRadians,
  isInBounds,
  normalizeAngle,
  normalizeRotation,
  rotatePoint,
} from '../geometry';
import type { Vector2 } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('isInBounds', () => {
  it('should return true for points inside image', () => {
    const image = { width: 100, height: 100 } as Image;
    
    expect(isInBounds(image, 0, 0)).toBe(true);
    expect(isInBounds(image, 50, 50)).toBe(true);
    expect(isInBounds(image, 99, 99)).toBe(true);
  });

  it('should return false for points outside image', () => {
    const image = { width: 100, height: 100 } as Image;
    
    expect(isInBounds(image, -1, 0)).toBe(false);
    expect(isInBounds(image, 0, -1)).toBe(false);
    expect(isInBounds(image, 100, 0)).toBe(false);
    expect(isInBounds(image, 0, 100)).toBe(false);
    expect(isInBounds(image, -10, -10)).toBe(false);
    expect(isInBounds(image, 200, 200)).toBe(false);
  });

  it('should handle edge cases correctly', () => {
    const image = { width: 1, height: 1 } as Image;
    
    expect(isInBounds(image, 0, 0)).toBe(true);
    expect(isInBounds(image, 1, 0)).toBe(false);
    expect(isInBounds(image, 0, 1)).toBe(false);
  });

  it('should work with rectangular images', () => {
    const image = { width: 200, height: 100 } as Image;
    
    expect(isInBounds(image, 150, 50)).toBe(true);
    expect(isInBounds(image, 199, 99)).toBe(true);
    expect(isInBounds(image, 200, 50)).toBe(false);
    expect(isInBounds(image, 150, 100)).toBe(false);
  });
});

describe('rotatePoint', () => {
  it('should not change point when rotating by 0 radians', () => {
    const point: Vector2 = { x: 10, y: 5 };
    const rotated = rotatePoint(point, 0);
    
    expect(rotated.x).toBeCloseTo(10);
    expect(rotated.y).toBeCloseTo(5);
  });

  it('should rotate point 90 degrees counterclockwise', () => {
    const point: Vector2 = { x: 10, y: 0 };
    const rotated = rotatePoint(point, Math.PI / 2);
    
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(10);
  });

  it('should rotate point 180 degrees', () => {
    const point: Vector2 = { x: 10, y: 5 };
    const rotated = rotatePoint(point, Math.PI);
    
    expect(rotated.x).toBeCloseTo(-10);
    expect(rotated.y).toBeCloseTo(-5);
  });

  it('should rotate point -90 degrees (90 clockwise)', () => {
    const point: Vector2 = { x: 0, y: 10 };
    const rotated = rotatePoint(point, -Math.PI / 2);
    
    expect(rotated.x).toBeCloseTo(10);
    expect(rotated.y).toBeCloseTo(0);
  });

  it('should handle rotation of origin', () => {
    const point: Vector2 = { x: 0, y: 0 };
    const rotated = rotatePoint(point, Math.PI / 4);
    
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(0);
  });

  it('should rotate point 45 degrees', () => {
    const point: Vector2 = { x: 10, y: 0 };
    const rotated = rotatePoint(point, Math.PI / 4);
    
    const expected = 10 * Math.sqrt(2) / 2;
    expect(rotated.x).toBeCloseTo(expected);
    expect(rotated.y).toBeCloseTo(expected);
  });

  it('should handle full rotation (360 degrees)', () => {
    const point: Vector2 = { x: 5, y: 3 };
    const rotated = rotatePoint(point, 2 * Math.PI);
    
    expect(rotated.x).toBeCloseTo(5);
    expect(rotated.y).toBeCloseTo(3);
  });
});

describe('degreesToRadians', () => {
  it('should convert 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('should convert 180 degrees to π radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });

  it('should convert 90 degrees to π/2 radians', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it('should convert -90 degrees to -π/2 radians', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
  });

  it('should convert 360 degrees to 2π radians', () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
  });

  it('should convert 45 degrees correctly', () => {
    expect(degreesToRadians(45)).toBeCloseTo(Math.PI / 4);
  });

  it('should handle large angles', () => {
    expect(degreesToRadians(720)).toBeCloseTo(4 * Math.PI);
  });

  it('should handle negative angles', () => {
    expect(degreesToRadians(-180)).toBeCloseTo(-Math.PI);
    expect(degreesToRadians(-360)).toBeCloseTo(-2 * Math.PI);
  });
});

describe('normalizeAngle', () => {
  it('should not change angles in range -180 to 180', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(-90)).toBe(-90);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(-180)).toBe(-180);
  });

  it('should normalize angles greater than 180', () => {
    expect(normalizeAngle(270)).toBe(-90);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(181)).toBe(-179);
  });

  it('should normalize angles less than -180', () => {
    expect(normalizeAngle(-270)).toBe(90);
    expect(normalizeAngle(-360)).toBe(0);
    expect(normalizeAngle(-450)).toBe(-90);
    expect(normalizeAngle(-181)).toBe(179);
  });

  it('should handle multiple rotations', () => {
    expect(normalizeAngle(720)).toBe(0);
    expect(normalizeAngle(-720)).toBe(0);
    expect(normalizeAngle(900)).toBe(180);
    expect(normalizeAngle(-900)).toBe(-180);
  });

  it('should handle edge cases', () => {
    expect(normalizeAngle(180.1)).toBeCloseTo(-179.9, 5);
    expect(normalizeAngle(-180.1)).toBeCloseTo(179.9, 5);
  });
});

describe('normalizeRotation', () => {
  it('should not change small angles', () => {
    const result = normalizeRotation(30, 100, 50);
    expect(result.rotation).toBe(30);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('should handle angles near 180 degrees', () => {
    const result = normalizeRotation(170, 100, 50);
    expect(result.rotation).toBeCloseTo(-10, 5);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('should handle angles near -180 degrees', () => {
    const result = normalizeRotation(-170, 100, 50);
    expect(result.rotation).toBeCloseTo(10, 5);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('should swap dimensions for angles > 45 degrees', () => {
    const result = normalizeRotation(70, 100, 50);
    expect(result.rotation).toBeCloseTo(-20, 5);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('should swap dimensions for angles < -45 degrees', () => {
    const result = normalizeRotation(-70, 100, 50);
    expect(result.rotation).toBeCloseTo(20, 5);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('should handle 90 degree rotation', () => {
    const result = normalizeRotation(90, 100, 50);
    expect(result.rotation).toBe(0);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('should handle -90 degree rotation', () => {
    const result = normalizeRotation(-90, 100, 50);
    expect(result.rotation).toBe(0);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('should handle edge case at 45 degrees', () => {
    const result = normalizeRotation(45, 100, 50);
    expect(result.rotation).toBe(45);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('should handle edge case at -45 degrees', () => {
    const result = normalizeRotation(-45, 100, 50);
    expect(result.rotation).toBe(-45);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('should handle multiple rotation normalization', () => {
    const result = normalizeRotation(135, 100, 50);
    expect(result.rotation).toBeCloseTo(45, 5);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('should handle square dimensions', () => {
    const result = normalizeRotation(90, 100, 100);
    expect(result.rotation).toBe(0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it('should log normalization steps', () => {
    const logSpy = vi.spyOn(console, 'log');
    logSpy.mockClear();
    
    normalizeRotation(170, 100, 50);
    
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('input rotation=170.00°'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('angle near ±180°'));
  });
}); 