import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Image } from 'image-js';
import path from 'path';
import fs from 'fs/promises';
import { FrameService } from '../../services/FrameService';
import { WorkspaceService } from '../../services/WorkspaceService';
import type { FrameData } from '@workspace/shared';
import {
  createPageWithRectangle,
  createPageWithRectangles,
  createTempDir,
  cleanupTempDir,
} from './helpers';

// Suppress console noise from the processing pipeline
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Save round-trip integration', () => {
  let frameService: FrameService;
  let workspaceService: WorkspaceService;
  let tmpDir: string;

  beforeEach(async () => {
    frameService = new FrameService();
    workspaceService = new WorkspaceService();
    tmpDir = await createTempDir();
    delete process.env.DEBUG;
  });

  afterEach(async () => {
    await cleanupTempDir(tmpDir);
  });

  /**
   * Helper: generate a real frame from a synthetic page image.
   */
  async function generateRealFrame(): Promise<FrameData> {
    const original = createPageWithRectangle(600, 400, 100, 75, 200, 150);
    const scaleFactor = 0.5;
    const scaled = original.resize({ width: Math.round(600 * scaleFactor) });
    const seed = { x: 100, y: 75 };
    return frameService.generateFrameFromSeed(
      original,
      scaled,
      scaleFactor,
      seed,
      '/test/scan.jpg'
    );
  }

  describe('save and reload', () => {
    it('should save a frame with orientation 0 and load it back', async () => {
      const frame = await generateRealFrame();
      const outputPath = path.join(tmpDir, 'output.png');

      await workspaceService.saveFrameToPath(frame, outputPath);

      // File should exist and be a valid PNG
      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(0);

      const reloaded = await Image.load(outputPath);
      expect(reloaded.width).toBeGreaterThan(0);
      expect(reloaded.height).toBeGreaterThan(0);

      // With orientation 0 the saved image dimensions should match the source
      const sourceImage = await Image.load(frame.imageData!);
      expect(reloaded.width).toBe(sourceImage.width);
      expect(reloaded.height).toBe(sourceImage.height);
    });

    it('should swap dimensions when saving with orientation 90', async () => {
      const frame = await generateRealFrame();
      const sourceImage = await Image.load(frame.imageData!);
      frame.orientation = 90;

      const outputPath = path.join(tmpDir, 'rotated90.png');
      await workspaceService.saveFrameToPath(frame, outputPath);

      const reloaded = await Image.load(outputPath);
      // 90-degree rotation swaps width and height
      expect(reloaded.width).toBe(sourceImage.height);
      expect(reloaded.height).toBe(sourceImage.width);
    });

    it('should preserve dimensions when saving with orientation 180', async () => {
      const frame = await generateRealFrame();
      const sourceImage = await Image.load(frame.imageData!);
      frame.orientation = 180;

      const outputPath = path.join(tmpDir, 'rotated180.png');
      await workspaceService.saveFrameToPath(frame, outputPath);

      const reloaded = await Image.load(outputPath);
      // 180-degree rotation preserves width and height
      expect(reloaded.width).toBe(sourceImage.width);
      expect(reloaded.height).toBe(sourceImage.height);
    });

    it('should swap dimensions when saving with orientation 270', async () => {
      const frame = await generateRealFrame();
      const sourceImage = await Image.load(frame.imageData!);
      frame.orientation = 270;

      const outputPath = path.join(tmpDir, 'rotated270.png');
      await workspaceService.saveFrameToPath(frame, outputPath);

      const reloaded = await Image.load(outputPath);
      // 270-degree rotation swaps width and height (same as 90)
      expect(reloaded.width).toBe(sourceImage.height);
      expect(reloaded.height).toBe(sourceImage.width);
    });
  });

  describe('multiple saves', () => {
    it('should save multiple frames to the same directory', async () => {
      // Page with 3 rectangles
      const original = createPageWithRectangles(800, 600, [
        { x: 50, y: 50, w: 150, h: 100 },
        { x: 350, y: 50, w: 150, h: 100 },
        { x: 50, y: 300, w: 150, h: 100 },
      ]);
      const scaleFactor = 0.5;
      const scaled = original.resize({ width: Math.round(800 * scaleFactor) });

      const seeds = [
        { x: Math.round(125 * scaleFactor), y: Math.round(100 * scaleFactor) },
        { x: Math.round(425 * scaleFactor), y: Math.round(100 * scaleFactor) },
        { x: Math.round(125 * scaleFactor), y: Math.round(350 * scaleFactor) },
      ];

      for (let i = 0; i < seeds.length; i++) {
        const frame = await frameService.generateFrameFromSeed(
          original,
          scaled,
          scaleFactor,
          seeds[i],
          '/test/multi.jpg'
        );
        const outputPath = path.join(tmpDir, `frame_${i + 1}.png`);
        await workspaceService.saveFrameToPath(frame, outputPath);
      }

      // All 3 files should exist and be valid images
      for (let i = 1; i <= 3; i++) {
        const filePath = path.join(tmpDir, `frame_${i}.png`);
        const stat = await fs.stat(filePath);
        expect(stat.size).toBeGreaterThan(0);

        const reloaded = await Image.load(filePath);
        expect(reloaded.width).toBeGreaterThan(0);
        expect(reloaded.height).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling', () => {
    it('should throw when saving a frame with no imageData', async () => {
      const frame: FrameData = {
        id: 'test-frame-1',
        label: 'Test',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        orientation: 0,
        imageData: undefined,
        pageId: 'page-test',
      };

      await expect(
        workspaceService.saveFrameToPath(frame, path.join(tmpDir, 'fail.png'))
      ).rejects.toThrow('no image data');
    });

    it('should throw when saving to a non-existent directory', async () => {
      const frame = await generateRealFrame();

      await expect(
        workspaceService.saveFrameToPath(frame, '/nonexistent/dir/file.png')
      ).rejects.toThrow();
    });
  });
});
