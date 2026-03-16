import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Image } from '../image-adapter';

// vi.hoisted runs before vi.mock factories, so these are available in both
const { mockRead, mockWrite, mockResize, mockImage, mockScaledImage } =
  vi.hoisted(() => {
    const mockRead = vi.fn();
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    const mockResize = vi.fn();
    const mockImage = {
      width: 1000,
      height: 800,
    };
    const mockScaledImage = {
      width: 500,
      height: 400,
    };
    mockRead.mockResolvedValue(mockImage);
    mockResize.mockReturnValue(mockScaledImage);
    return { mockRead, mockWrite, mockResize, mockImage, mockScaledImage };
  });

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../image-adapter', () => ({
  read: mockRead,
  write: mockWrite,
  resize: mockResize,
}));

// Suppress console.log noise from the module under test
vi.spyOn(console, 'log').mockImplementation(() => {});

import * as fs from 'fs/promises';
import {
  loadAndPrepareImage,
  saveProcessedImage,
  createOutputDirectories,
  saveDebugArtifacts,
} from '../image-io';

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply default mock return values after clearing
  mockRead.mockResolvedValue(mockImage);
  mockWrite.mockResolvedValue(undefined);
  mockResize.mockReturnValue(mockScaledImage);
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

    expect(mockResize).toHaveBeenCalledWith(mockImage, {
      width: 500,
      height: 400,
    });
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
  it('should call write with the correct output path and image', async () => {
    await saveProcessedImage(
      mockImage as unknown as Image,
      '/output/result.png'
    );

    expect(mockWrite).toHaveBeenCalledWith('/output/result.png', mockImage);
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
    const mockImg1 = { width: 100, height: 100 };
    const mockImg2 = { width: 200, height: 200 };
    const artifacts = {
      debugImages: [
        {
          image: mockImg1 as unknown as Image,
          filename: 'regions.png',
        },
        {
          image: mockImg2 as unknown as Image,
          filename: 'edges.png',
        },
      ],
    };

    await saveDebugArtifacts(artifacts, '/debug/out');

    expect(fs.mkdir).toHaveBeenCalledWith('/debug/out', { recursive: true });
    expect(mockWrite).toHaveBeenCalledWith('/debug/out/regions.png', mockImg1);
    expect(mockWrite).toHaveBeenCalledWith('/debug/out/edges.png', mockImg2);
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
