import { describe, expect, it, vi } from 'vitest';
import {
  scaleCoordinatesFloat,
  scaleCoordinates,
  scaleBoundingBox,
  transformCornersFloat,
  transformCorners,
  calculateAxisAlignedBoundsFloat,
  calculateAxisAlignedBounds,
  getBoundingBoxCenterFloat,
  getBoundingBoxCenter,
  translateBoundingBoxCenter,
} from '../coordinate-utils';
import type { BoundingBox, Vector2 } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('scaleCoordinatesFloat', () => {
  it('should return identical coordinates at identity scale 1.0', () => {
    const point: Vector2 = { x: 42, y: 73 };
    const result = scaleCoordinatesFloat(point, 1.0);

    expect(result.x).toBe(42);
    expect(result.y).toBe(73);
  });

  it('should double coordinates at scale 2.0', () => {
    const point: Vector2 = { x: 10, y: 20 };
    const result = scaleCoordinatesFloat(point, 2.0);

    expect(result.x).toBe(20);
    expect(result.y).toBe(40);
  });

  it('should halve coordinates at scale 0.5', () => {
    const point: Vector2 = { x: 10, y: 20 };
    const result = scaleCoordinatesFloat(point, 0.5);

    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
  });

  it('should preserve fractional precision at scale 0.3', () => {
    const point: Vector2 = { x: 100, y: 200 };
    const result = scaleCoordinatesFloat(point, 0.3);

    // 100 * 0.3 = 30.000000000000004 due to floating point
    expect(result.x).toBeCloseTo(30, 10);
    expect(result.y).toBeCloseTo(60, 10);
  });

  it('should keep zero coordinates at zero', () => {
    const point: Vector2 = { x: 0, y: 0 };
    const result = scaleCoordinatesFloat(point, 5.0);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('should handle negative coordinates', () => {
    const point: Vector2 = { x: -15, y: -25 };
    const result = scaleCoordinatesFloat(point, 2.0);

    expect(result.x).toBe(-30);
    expect(result.y).toBe(-50);
  });
});

describe('scaleCoordinates', () => {
  it('should round results to nearest integer', () => {
    const point: Vector2 = { x: 10, y: 20 };
    const result = scaleCoordinates(point, 0.3);

    // 10 * 0.3 = 3.0, 20 * 0.3 = 6.0
    expect(result.x).toBe(3);
    expect(result.y).toBe(6);
  });

  it('should round 0.5 correctly per Math.round behavior', () => {
    // Math.round(0.5) = 1, Math.round(1.5) = 2 (rounds to nearest even in some impls,
    // but JS Math.round always rounds .5 up)
    const point: Vector2 = { x: 1, y: 3 };
    const result = scaleCoordinates(point, 0.5);

    // 1 * 0.5 = 0.5 -> Math.round(0.5) = 1
    // 3 * 0.5 = 1.5 -> Math.round(1.5) = 2
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
  });

  it('should match float version when results are already integers', () => {
    const point: Vector2 = { x: 10, y: 20 };
    const rounded = scaleCoordinates(point, 2.0);
    const float = scaleCoordinatesFloat(point, 2.0);

    expect(rounded.x).toBe(float.x);
    expect(rounded.y).toBe(float.y);
  });

  it('should round negative coordinates correctly', () => {
    const point: Vector2 = { x: -7, y: -3 };
    const result = scaleCoordinates(point, 0.3);

    // -7 * 0.3 = -2.1 -> Math.round(-2.1) = -2
    // -3 * 0.3 = -0.9 -> Math.round(-0.9) = -1
    expect(result.x).toBe(Math.round(-7 * 0.3));
    expect(result.y).toBe(Math.round(-3 * 0.3));
  });
});

describe('scaleBoundingBox', () => {
  it('should scale position and dimensions but preserve rotation', () => {
    const box: BoundingBox = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 45,
    };
    const result = scaleBoundingBox(box, 2.0);

    expect(result.x).toBe(20);
    expect(result.y).toBe(40);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.rotation).toBe(45);
  });

  it('should return identical box at identity scale', () => {
    const box: BoundingBox = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 30,
    };
    const result = scaleBoundingBox(box, 1.0);

    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(result.rotation).toBe(30);
  });

  it('should handle scale up and scale down', () => {
    const box: BoundingBox = {
      x: 40,
      y: 60,
      width: 200,
      height: 100,
      rotation: 15,
    };

    const up = scaleBoundingBox(box, 3.0);
    expect(up.x).toBe(120);
    expect(up.y).toBe(180);
    expect(up.width).toBe(600);
    expect(up.height).toBe(300);
    expect(up.rotation).toBe(15);

    const down = scaleBoundingBox(box, 0.25);
    expect(down.x).toBe(10);
    expect(down.y).toBe(15);
    expect(down.width).toBe(50);
    expect(down.height).toBe(25);
    expect(down.rotation).toBe(15);
  });

  it('should handle zero-dimension box', () => {
    const box: BoundingBox = { x: 5, y: 10, width: 0, height: 0, rotation: 90 };
    const result = scaleBoundingBox(box, 2.0);

    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.rotation).toBe(90);
  });
});

describe('transformCornersFloat', () => {
  it('should return axis-aligned corners at zero rotation', () => {
    const box: BoundingBox = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
    };
    const corners = transformCornersFloat(box);

    expect(corners).toHaveLength(4);
    // cos(0)=1, sin(0)=0 → simple rectangle
    expect(corners[0]).toEqual({ x: 10, y: 20 });
    expect(corners[1]).toEqual({ x: 110, y: 20 });
    expect(corners[2]).toEqual({ x: 110, y: 70 });
    expect(corners[3]).toEqual({ x: 10, y: 70 });
  });

  it('should compute corners for 90-degree rotation', () => {
    const box: BoundingBox = {
      x: 50,
      y: 50,
      width: 100,
      height: 40,
      rotation: 90,
    };
    const corners = transformCornersFloat(box);

    // cos(90°)≈0, sin(90°)=1
    expect(corners).toHaveLength(4);
    expect(corners[0].x).toBeCloseTo(50, 5);
    expect(corners[0].y).toBeCloseTo(50, 5);
    // corner 1: x + w*cos(90) = 50+0, y + w*sin(90) = 50+100
    expect(corners[1].x).toBeCloseTo(50, 5);
    expect(corners[1].y).toBeCloseTo(150, 5);
    // corner 2: x + w*cos - h*sin = 50-40, y + w*sin + h*cos = 150+0
    expect(corners[2].x).toBeCloseTo(10, 5);
    expect(corners[2].y).toBeCloseTo(150, 5);
    // corner 3: x - h*sin = 50-40, y + h*cos = 50+0
    expect(corners[3].x).toBeCloseTo(10, 5);
    expect(corners[3].y).toBeCloseTo(50, 5);
  });

  it('should compute corners for 45-degree rotation with known trig values', () => {
    const box: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 0,
      rotation: 45,
    };
    const corners = transformCornersFloat(box);

    const cos45 = Math.cos(Math.PI / 4); // ≈0.7071
    const sin45 = Math.sin(Math.PI / 4); // ≈0.7071

    expect(corners[0]).toEqual({ x: 0, y: 0 });
    expect(corners[1].x).toBeCloseTo(100 * cos45, 5);
    expect(corners[1].y).toBeCloseTo(100 * sin45, 5);
    // height=0 so corners 2 and 3 collapse
    expect(corners[2].x).toBeCloseTo(100 * cos45, 5);
    expect(corners[2].y).toBeCloseTo(100 * sin45, 5);
    expect(corners[3]).toEqual({ x: 0, y: 0 });
  });

  it('should compute corners for 180-degree rotation', () => {
    const box: BoundingBox = {
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      rotation: 180,
    };
    const corners = transformCornersFloat(box);

    // cos(180°)=-1, sin(180°)≈0
    expect(corners[0].x).toBeCloseTo(100, 5);
    expect(corners[0].y).toBeCloseTo(100, 5);
    // corner 1: 100 + 50*(-1) = 50
    expect(corners[1].x).toBeCloseTo(50, 5);
    expect(corners[1].y).toBeCloseTo(100, 5);
    // corner 2: 50 - 30*0 = 50, 100 + 0 + 30*(-1) = 70
    expect(corners[2].x).toBeCloseTo(50, 5);
    expect(corners[2].y).toBeCloseTo(70, 5);
    // corner 3: 100 - 30*0 = 100, 100 + 30*(-1) = 70
    expect(corners[3].x).toBeCloseTo(100, 5);
    expect(corners[3].y).toBeCloseTo(70, 5);
  });

  it('should handle negative rotation', () => {
    const box: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: -90,
    };
    const corners = transformCornersFloat(box);

    // cos(-90°)≈0, sin(-90°)=-1
    expect(corners[0].x).toBeCloseTo(0, 5);
    expect(corners[0].y).toBeCloseTo(0, 5);
    // corner 1: x + w*cos(-90) = 0, y + w*sin(-90) = -100
    expect(corners[1].x).toBeCloseTo(0, 5);
    expect(corners[1].y).toBeCloseTo(-100, 5);
    // corner 2: 0 - 50*(-1) = 50, -100 + 50*cos(-90) = -100
    expect(corners[2].x).toBeCloseTo(50, 5);
    expect(corners[2].y).toBeCloseTo(-100, 5);
    // corner 3: 0 - 50*(-1) = 50, 0 + 50*cos(-90) = 0
    expect(corners[3].x).toBeCloseTo(50, 5);
    expect(corners[3].y).toBeCloseTo(0, 5);
  });

  it('should produce different shapes for square vs rectangle', () => {
    const square: BoundingBox = {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 30,
    };
    const rect: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 30,
    };

    const squareCorners = transformCornersFloat(square);
    const rectCorners = transformCornersFloat(rect);

    // They share corner 0 and corner 3 (same origin and same height)
    expect(squareCorners[0]).toEqual(rectCorners[0]);
    expect(squareCorners[3].x).toBeCloseTo(rectCorners[3].x, 10);
    expect(squareCorners[3].y).toBeCloseTo(rectCorners[3].y, 10);

    // But corners 1 and 2 differ because width is different
    expect(squareCorners[1].x).not.toBeCloseTo(rectCorners[1].x, 5);
  });

  it('should collapse all corners to origin for zero-size box', () => {
    const box: BoundingBox = {
      x: 25,
      y: 35,
      width: 0,
      height: 0,
      rotation: 60,
    };
    const corners = transformCornersFloat(box);

    for (const corner of corners) {
      expect(corner.x).toBeCloseTo(25, 10);
      expect(corner.y).toBeCloseTo(35, 10);
    }
  });
});

describe('transformCorners', () => {
  it('should produce identical output to transformCornersFloat', () => {
    const box: BoundingBox = {
      x: 10,
      y: 20,
      width: 150,
      height: 80,
      rotation: 37,
    };
    const fromFloat = transformCornersFloat(box);
    const fromRounded = transformCorners(box);

    expect(fromRounded).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(fromRounded[i].x).toBe(fromFloat[i].x);
      expect(fromRounded[i].y).toBe(fromFloat[i].y);
    }
  });
});

describe('calculateAxisAlignedBoundsFloat', () => {
  it('should return exact bounds for axis-aligned corners', () => {
    const corners: Vector2[] = [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 70 },
      { x: 10, y: 70 },
    ];
    const bounds = calculateAxisAlignedBoundsFloat(corners);

    expect(bounds.minX).toBe(10);
    expect(bounds.minY).toBe(20);
    expect(bounds.maxX).toBe(110);
    expect(bounds.maxY).toBe(70);
  });

  it('should produce a larger AABB for rotated corners', () => {
    // A 100x50 box rotated 45° will have an AABB larger than 100x50
    const box: BoundingBox = {
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      rotation: 45,
    };
    const corners = transformCornersFloat(box);
    const bounds = calculateAxisAlignedBoundsFloat(corners);

    // The AABB should be wider/taller than the original dimensions
    const aabbWidth = bounds.maxX - bounds.minX;
    const aabbHeight = bounds.maxY - bounds.minY;
    expect(aabbWidth).toBeGreaterThan(100);
    expect(aabbHeight).toBeGreaterThan(50);
  });

  it('should clamp negative min values to 0', () => {
    const corners: Vector2[] = [
      { x: -10, y: -20 },
      { x: 50, y: -20 },
      { x: 50, y: 30 },
      { x: -10, y: 30 },
    ];
    const bounds = calculateAxisAlignedBoundsFloat(corners);

    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(50);
    expect(bounds.maxY).toBe(30);
  });

  it('should clamp max values to imageWidth/imageHeight when provided', () => {
    const corners: Vector2[] = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 400 },
      { x: 0, y: 400 },
    ];
    const bounds = calculateAxisAlignedBoundsFloat(corners, 300, 200);

    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(300);
    expect(bounds.maxY).toBe(200);
  });

  it('should not clamp max when no image bounds are provided', () => {
    const corners: Vector2[] = [
      { x: 0, y: 0 },
      { x: 999, y: 0 },
      { x: 999, y: 888 },
      { x: 0, y: 888 },
    ];
    const bounds = calculateAxisAlignedBoundsFloat(corners);

    expect(bounds.maxX).toBe(999);
    expect(bounds.maxY).toBe(888);
  });

  it('should handle a single point (zero-area)', () => {
    const corners: Vector2[] = [
      { x: 42, y: 73 },
      { x: 42, y: 73 },
      { x: 42, y: 73 },
      { x: 42, y: 73 },
    ];
    const bounds = calculateAxisAlignedBoundsFloat(corners);

    expect(bounds.minX).toBe(42);
    expect(bounds.minY).toBe(73);
    expect(bounds.maxX).toBe(42);
    expect(bounds.maxY).toBe(73);
  });
});

describe('calculateAxisAlignedBounds', () => {
  it('should use floor for min and ceil for max', () => {
    const corners: Vector2[] = [
      { x: 10.3, y: 20.7 },
      { x: 110.8, y: 20.2 },
      { x: 110.1, y: 70.9 },
      { x: 10.9, y: 70.1 },
    ];
    const bounds = calculateAxisAlignedBounds(corners);

    // floor of mins: floor(10.3)=10, floor(20.2)=20
    expect(bounds.minX).toBe(10);
    expect(bounds.minY).toBe(20);
    // ceil of maxes: ceil(110.8)=111, ceil(70.9)=71
    expect(bounds.maxX).toBe(111);
    expect(bounds.maxY).toBe(71);
  });

  it('should clamp max to dimension minus 1', () => {
    const corners: Vector2[] = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 400 },
      { x: 0, y: 400 },
    ];
    // imageWidth=300, imageHeight=200 → max clamped to 299 and 199
    const bounds = calculateAxisAlignedBounds(corners, 300, 200);

    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(299);
    expect(bounds.maxY).toBe(199);
  });

  it('should match float version when all coordinates are integers', () => {
    const corners: Vector2[] = [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 70 },
      { x: 10, y: 70 },
    ];
    const floatBounds = calculateAxisAlignedBoundsFloat(corners);
    const intBounds = calculateAxisAlignedBounds(corners);

    // floor/ceil of integers should match the float version
    expect(intBounds.minX).toBe(floatBounds.minX);
    expect(intBounds.minY).toBe(floatBounds.minY);
    expect(intBounds.maxX).toBe(floatBounds.maxX);
    expect(intBounds.maxY).toBe(floatBounds.maxY);
  });
});

describe('getBoundingBoxCenterFloat', () => {
  it('should return center of axis-aligned box', () => {
    const box: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
    };
    const center = getBoundingBoxCenterFloat(box);

    // halfWidth=50, halfHeight=25, cos(0)=1, sin(0)=0
    // x = 0 + 50*1 - 25*0 = 50, y = 0 + 50*0 + 25*1 = 25
    expect(center.x).toBe(50);
    expect(center.y).toBe(25);
  });

  it('should compute rotated center correctly', () => {
    const box: BoundingBox = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 90,
    };
    const center = getBoundingBoxCenterFloat(box);

    // cos(90°)≈0, sin(90°)=1, halfW=50, halfH=25
    // x = 10 + 50*0 - 25*1 = -15
    // y = 20 + 50*1 + 25*0 = 70
    expect(center.x).toBeCloseTo(-15, 5);
    expect(center.y).toBeCloseTo(70, 5);
  });

  it('should return origin for zero-size box', () => {
    const box: BoundingBox = {
      x: 42,
      y: 73,
      width: 0,
      height: 0,
      rotation: 30,
    };
    const center = getBoundingBoxCenterFloat(box);

    // halfW=0, halfH=0 → center = origin regardless of rotation
    expect(center.x).toBeCloseTo(42, 10);
    expect(center.y).toBeCloseTo(73, 10);
  });

  it('should compute center for 45-degree square', () => {
    const box: BoundingBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 45,
    };
    const center = getBoundingBoxCenterFloat(box);

    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    // halfW=50, halfH=50
    // x = 50*cos45 - 50*sin45 = 0
    // y = 50*sin45 + 50*cos45 = 100*sin45 ≈ 70.71
    expect(center.x).toBeCloseTo(50 * cos45 - 50 * sin45, 5);
    expect(center.y).toBeCloseTo(50 * sin45 + 50 * cos45, 5);
  });
});

describe('getBoundingBoxCenter', () => {
  it('should produce identical output to getBoundingBoxCenterFloat', () => {
    const box: BoundingBox = {
      x: 15,
      y: 25,
      width: 200,
      height: 80,
      rotation: 63,
    };
    const fromFloat = getBoundingBoxCenterFloat(box);
    const fromRounded = getBoundingBoxCenter(box);

    expect(fromRounded.x).toBe(fromFloat.x);
    expect(fromRounded.y).toBe(fromFloat.y);
  });
});

describe('translateBoundingBoxCenter', () => {
  it('should subtract the crop offset from center', () => {
    const center: Vector2 = { x: 100, y: 200 };
    const result = translateBoundingBoxCenter(center, 30, 50);

    expect(result.x).toBe(70);
    expect(result.y).toBe(150);
  });

  it('should return same coordinates with zero offset', () => {
    const center: Vector2 = { x: 42, y: 73 };
    const result = translateBoundingBoxCenter(center, 0, 0);

    expect(result.x).toBe(42);
    expect(result.y).toBe(73);
  });

  it('should handle negative offset (shifts center positively)', () => {
    const center: Vector2 = { x: 50, y: 60 };
    const result = translateBoundingBoxCenter(center, -10, -20);

    // 50 - (-10) = 60, 60 - (-20) = 80
    expect(result.x).toBe(60);
    expect(result.y).toBe(80);
  });
});
