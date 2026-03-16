import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameService } from '../services/FrameService.js';
import type { BoundingBox, Vector2, ProcessingConfig } from '@workspace/shared/node';

// Mock all @workspace/shared processing functions
vi.mock('@workspace/shared', () => ({
  findBoundingBoxFromSeed: vi.fn(),
  scaleBoundingBox: vi.fn(),
  smartCrop: vi.fn(),
  saveFrameDebugImage: vi.fn(),
  generatePageId: vi.fn(),
  encodeDataURL: vi.fn(),
}));

import {
  findBoundingBoxFromSeed,
  scaleBoundingBox,
  smartCrop,
  saveFrameDebugImage,
  generatePageId,
  encodeDataURL,
} from '@workspace/shared/node';

const mockFindBoundingBoxFromSeed = findBoundingBoxFromSeed as ReturnType<
  typeof vi.fn
>;
const mockScaleBoundingBox = scaleBoundingBox as ReturnType<typeof vi.fn>;
const mockSmartCrop = smartCrop as ReturnType<typeof vi.fn>;
const mockSaveFrameDebugImage = saveFrameDebugImage as ReturnType<typeof vi.fn>;
const mockGeneratePageId = generatePageId as ReturnType<typeof vi.fn>;
const mockEncodeDataURL = encodeDataURL as ReturnType<typeof vi.fn>;

function createMockImage(width = 800, height = 600) {
  return {
    width,
    height,
    toDataURL: vi
      .fn()
      .mockReturnValue(`data:image/png;base64,mock_${width}x${height}`),
    resize: vi.fn(),
  };
}

function createMockBoundingBox(overrides?: Partial<BoundingBox>): BoundingBox {
  return {
    x: 100,
    y: 50,
    width: 200,
    height: 150,
    rotation: 2.5,
    ...overrides,
  };
}

describe('FrameService', () => {
  let service: FrameService;
  const defaultSeed: Vector2 = { x: 150, y: 100 };
  const defaultImagePath = '/test/scan.jpg';
  const defaultPageId = 'page-abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FrameService();

    // Default mock implementations
    mockGeneratePageId.mockReturnValue(defaultPageId);

    const scaledBB = createMockBoundingBox();
    mockFindBoundingBoxFromSeed.mockReturnValue({ boundingBox: scaledBB });

    const originalBB = createMockBoundingBox({
      x: 333,
      y: 167,
      width: 667,
      height: 500,
    });
    mockScaleBoundingBox.mockReturnValue(originalBB);

    const croppedImage = createMockImage(667, 500);
    mockSmartCrop.mockReturnValue(croppedImage);

    mockSaveFrameDebugImage.mockResolvedValue(undefined);

    mockEncodeDataURL.mockImplementation(
      (img: any) => `data:image/png;base64,mock_${img.width}x${img.height}`
    );

    // Ensure DEBUG is not set by default
    delete process.env.DEBUG;
  });

  describe('generateFrameFromSeed', () => {
    it('should return complete FrameData with all required fields', async () => {
      const original = createMockImage(2400, 1800);
      const scaled = createMockImage(720, 540);

      const frame = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.3,
        defaultSeed,
        defaultImagePath
      );

      expect(frame).toMatchObject({
        id: expect.stringContaining(defaultPageId),
        label: expect.stringContaining('Frame'),
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        rotation: expect.any(Number),
        orientation: 0,
        pageId: defaultPageId,
        imagePath: defaultImagePath,
        imageData: expect.stringContaining('data:image/png;base64,'),
      });
      expect(frame.imageScaleFactor).toBeCloseTo(1 / 0.3);
    });

    it('should generate frame ID following {pageId}-frame-{counter} pattern', async () => {
      const original = createMockImage();
      const scaled = createMockImage();

      const frame = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );

      expect(frame.id).toBe(`${defaultPageId}-frame-1`);
    });

    it('should increment counter across successive calls', async () => {
      const original = createMockImage();
      const scaled = createMockImage();

      const frame1 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      const frame2 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      const frame3 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );

      expect(frame1.id).toBe(`${defaultPageId}-frame-1`);
      expect(frame2.id).toBe(`${defaultPageId}-frame-2`);
      expect(frame3.id).toBe(`${defaultPageId}-frame-3`);
    });

    it('should inverse-scale bounding box back to original dimensions', async () => {
      const original = createMockImage();
      const scaled = createMockImage();
      const scaleFactor = 0.3;

      await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        scaleFactor,
        defaultSeed,
        defaultImagePath
      );

      // scaleBoundingBox should be called with 1/scaleFactor to go from scaled -> original
      expect(mockScaleBoundingBox).toHaveBeenCalledWith(
        expect.any(Object),
        1 / scaleFactor
      );
    });

    it('should call smartCrop with original image, not scaled image', async () => {
      const original = createMockImage(2400, 1800);
      const scaled = createMockImage(720, 540);

      await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.3,
        defaultSeed,
        defaultImagePath
      );

      // First argument to smartCrop must be the original (full-res) image
      const smartCropCalls = mockSmartCrop.mock.calls;
      expect(smartCropCalls).toHaveLength(1);
      expect(smartCropCalls[0][0]).toBe(original);
    });

    it('should still create frame with imageData undefined when encodeDataURL throws', async () => {
      const original = createMockImage();
      const scaled = createMockImage();
      const croppedImage = createMockImage();
      mockSmartCrop.mockReturnValue(croppedImage);
      mockEncodeDataURL.mockImplementation(() => {
        throw new Error('Canvas rendering failed');
      });

      const frame = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );

      expect(frame).toBeDefined();
      expect(frame.imageData).toBeUndefined();
      expect(frame.id).toBe(`${defaultPageId}-frame-1`);
      // Frame should still be persisted in the internal map
      expect(service.getFrame(frame.id)).toBeDefined();
    });

    it('should save debug image when DEBUG=true and skip otherwise', async () => {
      const original = createMockImage();
      const scaled = createMockImage();

      process.env.DEBUG = 'true';
      await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      expect(mockSaveFrameDebugImage).toHaveBeenCalledTimes(1);

      mockSaveFrameDebugImage.mockClear();
      delete process.env.DEBUG;
      await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      expect(mockSaveFrameDebugImage).not.toHaveBeenCalled();
    });
  });

  describe('updateFrame', () => {
    async function createTestFrame() {
      const original = createMockImage();
      const scaled = createMockImage();
      return service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
    }

    it('should return undefined for nonexistent frame ID', async () => {
      const result = await service.updateFrame('nonexistent-id', {
        label: 'test',
      });
      expect(result).toBeUndefined();
    });

    it('should not trigger smartCrop for metadata-only update', async () => {
      const frame = await createTestFrame();
      mockSmartCrop.mockClear();

      const updated = await service.updateFrame(frame.id, { label: 'Renamed' });

      expect(mockSmartCrop).not.toHaveBeenCalled();
      expect(updated).toBeDefined();
      expect(updated!.label).toBe('Renamed');
    });

    it('should trigger smartCrop when coordinates change with original image', async () => {
      const frame = await createTestFrame();
      mockSmartCrop.mockClear();
      mockScaleBoundingBox.mockClear();

      const original = createMockImage(2400, 1800);
      const newCroppedImage = createMockImage(300, 250);
      mockSmartCrop.mockReturnValue(newCroppedImage);

      const updated = await service.updateFrame(
        frame.id,
        { x: 200 },
        original as any
      );

      expect(mockSmartCrop).toHaveBeenCalledTimes(1);
      expect(mockScaleBoundingBox).toHaveBeenCalled();
      expect(updated).toBeDefined();
      expect(updated!.imageData).toBe(newCroppedImage.toDataURL());
    });

    it('should skip crop regeneration when coordinates change without original image', async () => {
      const frame = await createTestFrame();
      const originalImageData = frame.imageData;
      mockSmartCrop.mockClear();

      const updated = await service.updateFrame(frame.id, { x: 999 });

      expect(mockSmartCrop).not.toHaveBeenCalled();
      expect(updated).toBeDefined();
      expect(updated!.x).toBe(999);
      // imageData should be unchanged since no recrop happened
      expect(updated!.imageData).toBe(originalImageData);
    });

    it('should persist updated frame in internal map', async () => {
      const frame = await createTestFrame();
      await service.updateFrame(frame.id, { label: 'Updated Label' });

      const retrieved = service.getFrame(frame.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.label).toBe('Updated Label');
    });
  });

  describe('deleteFrame', () => {
    async function createTestFrame() {
      const original = createMockImage();
      const scaled = createMockImage();
      return service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
    }

    it('should delete existing frame and metadata, return true', async () => {
      const frame = await createTestFrame();

      const result = service.deleteFrame(frame.id);

      expect(result).toBe(true);
      expect(service.getFrame(frame.id)).toBeUndefined();
      expect(service.getFrameMetadata(frame.id)).toBeUndefined();
    });

    it('should return false for nonexistent frame ID', () => {
      const result = service.deleteFrame('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should exclude deleted frame from getAllFrames', async () => {
      const frame1 = await createTestFrame();
      const frame2 = await createTestFrame();
      const frame3 = await createTestFrame();

      service.deleteFrame(frame2.id);

      const allFrames = service.getAllFrames();
      expect(allFrames).toHaveLength(2);
      expect(allFrames.map((f) => f.id)).toEqual([frame1.id, frame3.id]);
    });
  });

  describe('clearAllFrames', () => {
    async function createTestFrame() {
      const original = createMockImage();
      const scaled = createMockImage();
      return service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
    }

    it('should clear all frames and metadata', async () => {
      const frame1 = await createTestFrame();
      const frame2 = await createTestFrame();

      service.clearAllFrames();

      expect(service.getAllFrames()).toHaveLength(0);
      expect(service.getFrame(frame1.id)).toBeUndefined();
      expect(service.getFrame(frame2.id)).toBeUndefined();
      expect(service.getFrameMetadata(frame1.id)).toBeUndefined();
      expect(service.getFrameMetadata(frame2.id)).toBeUndefined();
    });

    it('should reset counter so next frame starts at frame-1', async () => {
      await createTestFrame(); // frame-1
      await createTestFrame(); // frame-2
      await createTestFrame(); // frame-3

      service.clearAllFrames();

      const newFrame = await createTestFrame();
      expect(newFrame.id).toBe(`${defaultPageId}-frame-1`);
    });
  });

  describe('getAllFrames / getFrame', () => {
    it('should return frames in insertion order', async () => {
      const original = createMockImage();
      const scaled = createMockImage();

      const frame1 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      const frame2 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );
      const frame3 = await service.generateFrameFromSeed(
        original as any,
        scaled as any,
        0.5,
        defaultSeed,
        defaultImagePath
      );

      const allFrames = service.getAllFrames();
      expect(allFrames).toHaveLength(3);
      expect(allFrames[0].id).toBe(frame1.id);
      expect(allFrames[1].id).toBe(frame2.id);
      expect(allFrames[2].id).toBe(frame3.id);
    });
  });
});
