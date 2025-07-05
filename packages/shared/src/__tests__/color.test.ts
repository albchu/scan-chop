import { describe, expect, it, vi } from 'vitest';
import { calculateBrightness, createWhiteBoundaryPredicate, type ColorPredicate } from '../color';
import type { RGB } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('calculateBrightness', () => {
  it('should calculate brightness for black', () => {
    const black: RGB = [0, 0, 0];
    expect(calculateBrightness(black)).toBe(0);
  });

  it('should calculate brightness for white', () => {
    const white: RGB = [255, 255, 255];
    expect(calculateBrightness(white)).toBe(255);
  });

  it('should calculate brightness for pure red', () => {
    const red: RGB = [255, 0, 0];
    expect(calculateBrightness(red)).toBe(85); // 255/3
  });

  it('should calculate brightness for pure green', () => {
    const green: RGB = [0, 255, 0];
    expect(calculateBrightness(green)).toBe(85); // 255/3
  });

  it('should calculate brightness for pure blue', () => {
    const blue: RGB = [0, 0, 255];
    expect(calculateBrightness(blue)).toBe(85); // 255/3
  });

  it('should calculate brightness for gray', () => {
    const gray: RGB = [128, 128, 128];
    expect(calculateBrightness(gray)).toBe(128);
  });

  it('should handle mixed colors', () => {
    const color: RGB = [100, 150, 200];
    expect(calculateBrightness(color)).toBe(150); // (100+150+200)/3
  });

  it('should handle edge values', () => {
    const color: RGB = [0, 128, 255];
    expect(calculateBrightness(color)).toBeCloseTo(127.67, 1);
  });
});

describe('createWhiteBoundaryPredicate', () => {
  it('should create predicate with default threshold', () => {
    const predicate = createWhiteBoundaryPredicate();
    
    // Should allow dark colors
    expect(predicate([50, 50, 50], [0, 0, 0])).toBe(true);
    
    // Should block white colors (brightness >= 250)
    expect(predicate([250, 250, 250], [0, 0, 0])).toBe(false);
    expect(predicate([255, 255, 255], [0, 0, 0])).toBe(false);
  });

  it('should create predicate with custom threshold', () => {
    const predicate = createWhiteBoundaryPredicate(200);
    
    // Should allow colors below threshold
    expect(predicate([100, 100, 100], [0, 0, 0])).toBe(true);
    expect(predicate([199, 199, 199], [0, 0, 0])).toBe(true);
    
    // Should block colors at or above threshold
    expect(predicate([200, 200, 200], [0, 0, 0])).toBe(false);
    expect(predicate([255, 255, 255], [0, 0, 0])).toBe(false);
  });

  it('should log boundary hits for first 5 occurrences', () => {
    const logSpy = vi.spyOn(console, 'log');
    const predicate = createWhiteBoundaryPredicate(100);
    
    // Hit boundary 7 times
    for (let i = 0; i < 7; i++) {
      predicate([150, 150, 150], [0, 0, 0]); // brightness = 150
    }
    
    // Should only log first 5 times
    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('🚧 Hit boundary pixel: RGB(150, 150, 150), brightness=150.0')
    );
  });

  it('should handle near-white colors', () => {
    const predicate = createWhiteBoundaryPredicate(240);
    
    // Just below threshold
    expect(predicate([239, 239, 239], [0, 0, 0])).toBe(true);
    
    // At threshold
    expect(predicate([240, 240, 240], [0, 0, 0])).toBe(false);
    
    // Above threshold
    expect(predicate([245, 245, 245], [0, 0, 0])).toBe(false);
  });

  it('should work with mixed brightness colors', () => {
    const predicate = createWhiteBoundaryPredicate(200);
    
    // Average brightness below threshold
    const darkMix: RGB = [100, 150, 200]; // brightness = 150
    expect(predicate(darkMix, [0, 0, 0])).toBe(true);
    
    // Average brightness above threshold
    const brightMix: RGB = [200, 210, 220]; // brightness = 210
    expect(predicate(brightMix, [0, 0, 0])).toBe(false);
  });

  it('should ignore reference color in white boundary predicate', () => {
    const predicate = createWhiteBoundaryPredicate(200);
    const target: RGB = [150, 150, 150];
    
    // Reference color shouldn't affect result
    expect(predicate(target, [0, 0, 0])).toBe(true);
    expect(predicate(target, [255, 255, 255])).toBe(true);
    expect(predicate(target, [100, 100, 100])).toBe(true);
  });

  it('should maintain separate boundary hit counters for different predicates', () => {
    const logSpy = vi.spyOn(console, 'log');
    logSpy.mockClear();
    
    const predicate1 = createWhiteBoundaryPredicate(100);
    const predicate2 = createWhiteBoundaryPredicate(100);
    
    // Each predicate should have its own counter
    for (let i = 0; i < 3; i++) {
      predicate1([150, 150, 150], [0, 0, 0]);
      predicate2([150, 150, 150], [0, 0, 0]);
    }
    
    // Should log 6 times total (3 for each predicate)
    expect(logSpy).toHaveBeenCalledTimes(6);
  });

  it('should handle edge case thresholds', () => {
    // Very low threshold
    const strictPredicate = createWhiteBoundaryPredicate(1);
    expect(strictPredicate([0, 0, 0], [0, 0, 0])).toBe(true); // black passes
    expect(strictPredicate([1, 1, 1], [0, 0, 0])).toBe(false); // anything else fails
    
    // Maximum threshold
    const permissivePredicate = createWhiteBoundaryPredicate(255);
    expect(permissivePredicate([254, 254, 254], [0, 0, 0])).toBe(true);
    expect(permissivePredicate([255, 255, 255], [0, 0, 0])).toBe(false);
  });
}); 