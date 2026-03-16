import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resize, decode } from '@workspace/shared/node';
import type { Image } from '@workspace/shared/node';
import { FrameService } from '../../services/FrameService.js';
import {
  createPageWithRectangle,
  createPageWithRectangles,
  createWhitePage,
} from './helpers.js';

// Suppress console noise from the processing pipeline
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('FrameService integration (real processing pipeline)', () => {
  let service: FrameService;

  beforeEach(() => {
    service = new FrameService();
    delete process.env.DEBUG;
  });

  describe('single rectangle detection', () => {
    it('should detect an axis-aligned rectangle', async () => {
      // 600x400 white page with a 200x150 dark rect at (100, 75)
      const original = createPageWithRectangle(600, 400, 100, 75, 200, 150);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(600 * scaleFactor) });

      // Seed in the center of the rectangle in scaled coordinates
      const seed = {
        x: Math.round((100 + 100) * scaleFactor),
        y: Math.round((75 + 75) * scaleFactor),
      };

      const frame = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan.jpg'
      );

      // Bounding box dimensions should be in the vicinity of scaled rect (100x75)
      expect(frame.width).toBeGreaterThan(100 * 0.7);
      expect(frame.width).toBeLessThan(100 * 1.4);
      expect(frame.height).toBeGreaterThan(75 * 0.7);
      expect(frame.height).toBeLessThan(75 * 1.4);
      // Rotation should be near zero for an axis-aligned rectangle
      expect(Math.abs(frame.rotation)).toBeLessThan(3);
      // Should have valid base64 image data
      expect(frame.imageData).toBeDefined();
      expect(frame.imageData!).toMatch(/^data:image\/png;base64,/);
      expect(frame.orientation).toBe(0);
    });

    it('should detect a rectangle at a different position', async () => {
      // 800x600 page with a 150x100 rect at (500, 350)
      const original = createPageWithRectangle(800, 600, 500, 350, 150, 100);
      const scaleFactor = 0.3;
      const scaled = resize(original, { width: Math.round(800 * scaleFactor) });

      // Seed in center of rect in scaled coords
      const seed = {
        x: Math.round((500 + 75) * scaleFactor),
        y: Math.round((350 + 50) * scaleFactor),
      };

      const frame = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan2.jpg'
      );

      // Bounding box position should be near the rect's scaled position
      const expectedX = 500 * scaleFactor;
      const expectedY = 350 * scaleFactor;
      expect(frame.x).toBeGreaterThan(expectedX - 30);
      expect(frame.x).toBeLessThan(expectedX + 30);
      expect(frame.y).toBeGreaterThan(expectedY - 30);
      expect(frame.y).toBeLessThan(expectedY + 30);
      // Frame ID follows the expected pattern
      expect(frame.id).toMatch(/^page-[0-9a-f]+-frame-1$/);
    });

    it('should increment frame counter across detections', async () => {
      const original = createPageWithRectangle(600, 400, 100, 75, 200, 150);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(600 * scaleFactor) });
      const seed = { x: 100, y: 75 };

      const frame1 = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan.jpg'
      );
      const frame2 = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan.jpg'
      );

      expect(frame1.id).toContain('frame-1');
      expect(frame2.id).toContain('frame-2');
    });
  });

  describe('image quality and encoding', () => {
    it('should produce imageData that round-trips through decode()', async () => {
      const original = createPageWithRectangle(600, 400, 100, 75, 200, 150);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(600 * scaleFactor) });
      const seed = { x: 100, y: 75 };

      const frame = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan.jpg'
      );

      expect(frame.imageData).toBeDefined();

      // Verify the base64 can be decoded back into a valid image
      const reloaded = await decode(frame.imageData!);
      expect(reloaded.width).toBeGreaterThan(0);
      expect(reloaded.height).toBeGreaterThan(0);
    });

    it('should produce a cropped image with proportional aspect ratio', async () => {
      // 800x600 page with 300x200 rect (aspect ratio 1.5)
      const original = createPageWithRectangle(800, 600, 100, 100, 300, 200);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(800 * scaleFactor) });
      const seed = {
        x: Math.round(250 * scaleFactor),
        y: Math.round(200 * scaleFactor),
      };

      const frame = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed,
        '/test/scan.jpg'
      );

      const reloaded = await decode(frame.imageData!);
      const actualRatio = reloaded.width / reloaded.height;
      const expectedRatio = 300 / 200; // 1.5

      // Allow tolerance for crop insets, padding, rotation correction
      expect(actualRatio).toBeGreaterThan(expectedRatio - 0.4);
      expect(actualRatio).toBeLessThan(expectedRatio + 0.4);
    });
  });

  describe('edge cases', () => {
    it('should throw when seed is on white background', async () => {
      // All-white page with no rectangles
      const original = createWhitePage(400, 300);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(400 * scaleFactor) });
      const seed = { x: 100, y: 75 };

      await expect(
        service.generateFrameFromSeed(
          original,
          scaled,
          scaleFactor,
          seed,
          '/test.jpg'
        )
      ).rejects.toThrow();
    });

    it('should throw when seed is out of image bounds', async () => {
      const original = createPageWithRectangle(600, 400, 100, 75, 200, 150);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(600 * scaleFactor) });

      await expect(
        service.generateFrameFromSeed(
          original,
          scaled,
          scaleFactor,
          { x: -10, y: -10 },
          '/test.jpg'
        )
      ).rejects.toThrow();
    });

    it('should throw or produce a valid frame for a very small rectangle', async () => {
      // 400x300 page with a tiny 8x8 rectangle (likely below default minArea)
      const original = createPageWithRectangle(400, 300, 100, 100, 8, 8);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(400 * scaleFactor) });
      const seed = {
        x: Math.round(104 * scaleFactor),
        y: Math.round(104 * scaleFactor),
      };

      try {
        const frame = await service.generateFrameFromSeed(
          original,
          scaled,
          scaleFactor,
          seed,
          '/test.jpg'
        );
        // If it succeeded, the frame should be valid
        expect(frame.id).toBeDefined();
        expect(frame.width).toBeGreaterThan(0);
      } catch (error) {
        // If it threw, it should be a validation error (region too small)
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/invalid|too small|region/i);
      }
    });
  });

  describe('two rectangles on one page', () => {
    it('should produce distinct frames for two separate rectangles', async () => {
      // Two well-separated rectangles on an 800x600 page
      const original = createPageWithRectangles(800, 600, [
        { x: 50, y: 50, w: 150, h: 100 },
        { x: 500, y: 350, w: 150, h: 100 },
      ]);
      const scaleFactor = 0.5;
      const scaled = resize(original, { width: Math.round(800 * scaleFactor) });

      // Seed in center of first rectangle (scaled coords)
      const seed1 = {
        x: Math.round((50 + 75) * scaleFactor),
        y: Math.round((50 + 50) * scaleFactor),
      };
      // Seed in center of second rectangle (scaled coords)
      const seed2 = {
        x: Math.round((500 + 75) * scaleFactor),
        y: Math.round((350 + 50) * scaleFactor),
      };

      const frame1 = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed1,
        '/test.jpg'
      );
      const frame2 = await service.generateFrameFromSeed(
        original,
        scaled,
        scaleFactor,
        seed2,
        '/test.jpg'
      );

      // Frames should have different positions (at least 100px apart in scaled space)
      const dx = Math.abs(frame1.x - frame2.x);
      const dy = Math.abs(frame1.y - frame2.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      expect(distance).toBeGreaterThan(100);

      // Both should have valid image data
      expect(frame1.imageData).toBeDefined();
      expect(frame2.imageData).toBeDefined();
    });
  });
});
