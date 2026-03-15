import { describe, expect, it, vi, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factories, so these are available in both
const { mockResize, mockSave, mockImage, mockScaledImage } = vi.hoisted(() => {
  const mockResize = vi.fn();
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockImage = {
    width: 1000,
    height: 800,
    resize: mockResize,
    save: mockSave,
  };
  const mockScaledImage = {
    width: 500,
    height: 400,
    resize: mockResize,
    save: mockSave,
  };
  mockResize.mockReturnValue(mockScaledImage);
  return { mockResize, mockSave, mockImage, mockScaledImage };
});

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('image-js', () => ({
  Image: {
    load: vi.fn().mockResolvedValue(mockImage),
  },
}));

// Suppress console.log noise from the module under test
vi.spyOn(console, 'log').mockImplementation(() => {});

import * as fs from 'fs/promises';
import { Image } from 'image-js';
import {
  loadAndPrepareImage,
  saveProcessedImage,
  createOutputDirectories,
  saveDebugArtifacts,
} from '../image-io';

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply default mock return values after clearing
  mockResize.mockReturnValue(mockScaledImage);
  mockSave.mockResolvedValue(undefined);
  (Image.load as ReturnType<typeof vi.fn>).mockResolvedValue(mockImage);
  (fs.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fs.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('loadAndPrepareImage', () => {
  it('should return same reference for original and scaled when factor is 1.0', async () => {
    const result = await loadAndPrepareImage('/img/photo.png', 1.0);

    expect(result.original).toBe(result.scaled);
    expect(result.scaleFactor).toBe(1.0);
    expect(mockResize).not.toHaveBeenCalled();
  });

  it('should downsample when factor is 0.5', async () => {
    const result = await loadAndPrepareImage('/img/photo.png', 0.5);

    expect(mockResize).toHaveBeenCalledWith({ width: 500, height: 400 });
    expect(result.scaleFactor).toBe(0.5);
    expect(result.original).toBe(mockImage);
    expect(result.scaled).toBe(mockScaledImage);
  });

  it('should return a scaleFactor that matches the input downsampleFactor', async () => {
    const factor = 0.3;
    const result = await loadAndPrepareImage('/img/photo.png', factor);

    expect(result.scaleFactor).toBe(factor);
  });

  it('should default to factor 1.0 when called with only imagePath', async () => {
    const result = await loadAndPrepareImage('/img/photo.png');

    expect(result.original).toBe(result.scaled);
    expect(result.scaleFactor).toBe(1.0);
    expect(mockResize).not.toHaveBeenCalled();
  });
});

describe('saveProcessedImage', () => {
  it('should call image.save with the correct output path', async () => {
    await saveProcessedImage(
      mockImage as unknown as Image,
      '/output/result.png'
    );

    expect(mockSave).toHaveBeenCalledWith('/output/result.png');
  });

  it('should accept an options parameter without error', async () => {
    await expect(
      saveProcessedImage(mockImage as unknown as Image, '/output/result.png', {
        quality: 90,
        compression: 6,
      })
    ).resolves.toBeUndefined();
  });
});

describe('createOutputDirectories', () => {
  it('should create the base directory with recursive option', async () => {
    await createOutputDirectories('/output/base');

    expect(fs.mkdir).toHaveBeenCalledWith('/output/base', { recursive: true });
  });

  it('should create each subdirectory under the base directory', async () => {
    await createOutputDirectories('/output/base', [
      'frames',
      'debug',
      'thumbs',
    ]);

    expect(fs.mkdir).toHaveBeenCalledWith('/output/base', { recursive: true });
    expect(fs.mkdir).toHaveBeenCalledWith('/output/base/frames', {
      recursive: true,
    });
    expect(fs.mkdir).toHaveBeenCalledWith('/output/base/debug', {
      recursive: true,
    });
    expect(fs.mkdir).toHaveBeenCalledWith('/output/base/thumbs', {
      recursive: true,
    });
    expect(fs.mkdir).toHaveBeenCalledTimes(4);
  });

  it('should only create the base directory when subdirs is empty', async () => {
    await createOutputDirectories('/output/base', []);

    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.mkdir).toHaveBeenCalledWith('/output/base', { recursive: true });
  });
});

describe('saveDebugArtifacts', () => {
  it('should save each debug image to the output directory', async () => {
    const mockImgSave1 = vi.fn().mockResolvedValue(undefined);
    const mockImgSave2 = vi.fn().mockResolvedValue(undefined);
    const artifacts = {
      debugImages: [
        {
          image: { save: mockImgSave1 } as unknown as Image,
          filename: 'regions.png',
        },
        {
          image: { save: mockImgSave2 } as unknown as Image,
          filename: 'edges.png',
        },
      ],
    };

    await saveDebugArtifacts(artifacts, '/debug/out');

    expect(fs.mkdir).toHaveBeenCalledWith('/debug/out', { recursive: true });
    expect(mockImgSave1).toHaveBeenCalledWith('/debug/out/regions.png');
    expect(mockImgSave2).toHaveBeenCalledWith('/debug/out/edges.png');
  });

  it('should write metadata JSON when metadata is present', async () => {
    const artifacts = {
      debugImages: [],
      metadata: { seedX: 100, seedY: 200, threshold: 230 },
    };

    await saveDebugArtifacts(artifacts, '/debug/out');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/debug/out/debug-metadata.json',
      JSON.stringify({ seedX: 100, seedY: 200, threshold: 230 }, null, 2),
      'utf-8'
    );
  });

  it('should not write metadata when metadata is absent', async () => {
    const artifacts = {
      debugImages: [],
    };

    await saveDebugArtifacts(artifacts, '/debug/out');

    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
