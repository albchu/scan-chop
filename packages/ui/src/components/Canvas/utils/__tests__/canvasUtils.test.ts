import { describe, it, expect } from 'vitest';
import { getCursorStyle, getTransformStyle } from '../canvasUtils';

describe('canvasUtils', () => {
  describe('getCursorStyle', () => {
    it('returns grabbing cursor when dragging', () => {
      expect(getCursorStyle(true, false)).toBe('cursor-grabbing select-none');
    });

    it('returns grab cursor when command is pressed', () => {
      expect(getCursorStyle(false, true)).toBe('cursor-grab');
    });

    it('returns grab cursor by default (documents that isCommandPressed has no effect)', () => {
      // Both false paths return the same value — potential bug in source
      expect(getCursorStyle(false, false)).toBe('cursor-grab');
      expect(getCursorStyle(false, true)).toBe(getCursorStyle(false, false));
    });
  });

  describe('getTransformStyle', () => {
    it('returns CSS with translate, scale, and transition when not dragging', () => {
      const style = getTransformStyle({ x: 10, y: 20 }, 0.5, false);

      expect(style.transform).toBe('translate(10px, 20px) scale(0.5)');
      expect(style.transformOrigin).toBe('center center');
      expect(style.transition).toBe('transform 0.1s ease-out');
    });

    it('disables transition when dragging', () => {
      const style = getTransformStyle({ x: 0, y: 0 }, 1, true);

      expect(style.transition).toBe('none');
    });
  });
});
