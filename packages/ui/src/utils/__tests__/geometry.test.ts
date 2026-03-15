import { describe, it, expect } from 'vitest';
import { rotateVector } from '../geometry';

describe('rotateVector', () => {
  it('returns unchanged vector at 0 degrees', () => {
    expect(rotateVector({ x: 10, y: 5 }, 0)).toEqual({ x: 10, y: 5 });
  });

  it('rotates 90 degrees correctly', () => {
    // (1,0) rotated 90° → (0,1)
    const result = rotateVector({ x: 1, y: 0 }, 90);
    expect(result.x).toBe(0);
    expect(result.y).toBe(1);
  });

  it('rotates 180 degrees correctly', () => {
    // (1,0) rotated 180° → (-1,0)
    const result = rotateVector({ x: 1, y: 0 }, 180);
    expect(result.x).toBe(-1);
    expect(result.y).toBe(0);
  });

  it('rotates 270 degrees correctly', () => {
    // (1,0) rotated 270° → (0,-1). Math.round(-0) produces -0 in JS.
    const result = rotateVector({ x: 1, y: 0 }, 270);
    expect(result.x + 0).toBe(0); // normalize -0 to 0
    expect(result.y).toBe(-1);
  });

  it('returns to original at 360 degrees', () => {
    const result = rotateVector({ x: 7, y: 3 }, 360);
    expect(result.x).toBe(7);
    expect(result.y).toBe(3);
  });

  it('handles negative angles equivalently', () => {
    const pos = rotateVector({ x: 1, y: 0 }, 270);
    const neg = rotateVector({ x: 1, y: 0 }, -90);
    // Both produce the same effective rotation; compare magnitudes to avoid -0/+0 mismatch
    expect(pos.x + 0).toBe(neg.x + 0);
    expect(pos.y).toBe(neg.y);
  });

  it('rounds results to integers', () => {
    // 45 degrees should produce non-integer intermediate values that get rounded
    const result = rotateVector({ x: 10, y: 0 }, 45);
    expect(Number.isInteger(result.x)).toBe(true);
    expect(Number.isInteger(result.y)).toBe(true);
  });
});
