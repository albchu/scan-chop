import { useMemo, useCallback } from 'react';
import { FrameData } from '@workspace/shared';

interface UseFrameNavigationOptions {
  frames: FrameData[];
  currentFrameId: string | null;
  onFrameChange: (frameId: string) => void;
}

export interface UseFrameNavigationResult {
  // Current state
  currentFrame: FrameData | null;
  currentIndex: number;
  totalFrames: number;

  // Navigation state
  canGoPrevious: boolean;
  canGoNext: boolean;

  // Navigation actions
  goToPrevious: () => void;
  goToNext: () => void;
  goToFirst: () => void;
  goToLast: () => void;
}

export const useFrameNavigation = ({
  frames,
  currentFrameId,
  onFrameChange,
}: UseFrameNavigationOptions): UseFrameNavigationResult => {
  // Filter frames with images
  const framesWithImages = useMemo(
    () => frames.filter((f) => f.imageData !== null && f.imageData !== undefined),
    [frames]
  );

  // Calculate current index
  const currentIndex = useMemo(
    () => (currentFrameId ? framesWithImages.findIndex((f) => f.id === currentFrameId) : -1),
    [framesWithImages, currentFrameId]
  );

  // Get current frame
  const currentFrame = useMemo(
    () => (currentIndex !== -1 ? framesWithImages[currentIndex] : null),
    [framesWithImages, currentIndex]
  );

  // Calculate navigation availability
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < framesWithImages.length - 1 && currentIndex !== -1;

  // Navigation callbacks
  const goToPrevious = useCallback(() => {
    if (!framesWithImages.length || currentIndex <= 0) return;
    onFrameChange(framesWithImages[currentIndex - 1].id);
  }, [currentIndex, framesWithImages, onFrameChange]);

  const goToNext = useCallback(() => {
    if (!framesWithImages.length || currentIndex < 0 || currentIndex >= framesWithImages.length - 1) return;
    onFrameChange(framesWithImages[currentIndex + 1].id);
  }, [currentIndex, framesWithImages, onFrameChange]);

  const goToFirst = useCallback(() => {
    if (framesWithImages.length > 0) {
      onFrameChange(framesWithImages[0].id);
    }
  }, [framesWithImages, onFrameChange]);

  const goToLast = useCallback(() => {
    if (framesWithImages.length > 0) {
      onFrameChange(framesWithImages[framesWithImages.length - 1].id);
    }
  }, [framesWithImages, onFrameChange]);

  return {
    // Current state
    currentFrame,
    currentIndex,
    totalFrames: framesWithImages.length,

    // Navigation state
    canGoPrevious,
    canGoNext,

    // Navigation actions
    goToPrevious,
    goToNext,
    goToFirst,
    goToLast,
  };
};
