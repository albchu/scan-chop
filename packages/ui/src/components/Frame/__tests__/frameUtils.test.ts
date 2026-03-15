import { describe, it, expect } from 'vitest';
import {
  createTransformString,
  calculateMoveableZoom,
  formatSizeDisplay,
  formatRotationDisplay,
} from '../frameUtils';

describe('frameUtils', () => {
  describe('createTransformString', () => {
    it('returns correct CSS transform', () => {
      expect(createTransformString(100, 200, 45)).toBe(
        'translate(100px, 200px) rotate(45deg)'
      );
    });
  });

  describe('calculateMoveableZoom', () => {
    it('returns inverse of totalScale', () => {
      expect(calculateMoveableZoom(2)).toBeCloseTo(0.5);
      expect(calculateMoveableZoom(0.5)).toBeCloseTo(2);
    });

    it('clamps to minimum of 0.5', () => {
      // Very large totalScale → very small inverse
      expect(calculateMoveableZoom(100)).toBe(0.5);
    });

    it('clamps to maximum of 16', () => {
      // Very small totalScale → very large inverse
      expect(calculateMoveableZoom(0.01)).toBe(16);
    });
  });

  describe('formatSizeDisplay', () => {
    it('displays rounded dimensions without scaleFactor', () => {
      expect(formatSizeDisplay(123.7, 456.2)).toBe('124 \u00d7 456');
    });

    it('displays original dimensions with scaleFactor', () => {
      // 200 * 2 = 400, 100 * 2 = 200
      expect(formatSizeDisplay(200, 100, 2)).toBe('400 \u00d7 200');
    });
  });

  describe('formatRotationDisplay', () => {
    it('formats to 1 decimal with degree symbol', () => {
      expect(formatRotationDisplay(12.345)).toBe('12.3\u00b0');
      expect(formatRotationDisplay(0)).toBe('0.0\u00b0');
    });
  });
});
