import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Vector2 } from '@workspace/shared';

interface CanvasState {
  // Zoom and pan state
  zoom: number;
  panOffset: Vector2;
  canvasSize: { width: number; height: number };

  // Tracked page dimensions for recalculation on canvas resize
  pageWidth: number;
  pageHeight: number;

  // Computed values
  baseScale: number;
  totalScale: number;

  // Actions
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Vector2) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  resetView: () => void;

  // Compute helpers
  updateScales: (pageWidth?: number, pageHeight?: number) => void;
}

const CANVAS_PADDING = 100;

function computeBaseScale(
  canvasWidth: number,
  canvasHeight: number,
  pageWidth: number,
  pageHeight: number
): number {
  if (!canvasWidth || !canvasHeight || !pageWidth || !pageHeight) {
    return 1;
  }
  const scaleX = (canvasWidth - CANVAS_PADDING) / pageWidth;
  const scaleY = (canvasHeight - CANVAS_PADDING) / pageHeight;
  return Math.min(scaleX, scaleY, 1);
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      zoom: 100,
      panOffset: { x: 0, y: 0 },
      canvasSize: { width: 0, height: 0 },
      pageWidth: 0,
      pageHeight: 0,
      baseScale: 1,
      totalScale: 1,

      // Actions
      setZoom: (zoom) =>
        set((state) => {
          state.zoom = zoom;
          state.totalScale = state.baseScale * (zoom / 100);
        }),

      setPanOffset: (offset) =>
        set((state) => {
          state.panOffset = offset;
        }),

      setCanvasSize: (size) =>
        set((state) => {
          state.canvasSize = size;
          state.baseScale = computeBaseScale(
            size.width,
            size.height,
            state.pageWidth,
            state.pageHeight
          );
          state.totalScale = state.baseScale * (state.zoom / 100);
        }),

      resetView: () =>
        set((state) => {
          state.zoom = 100;
          state.panOffset = { x: 0, y: 0 };
          state.totalScale = state.baseScale;
        }),

      updateScales: (pageWidth?: number, pageHeight?: number) =>
        set((state) => {
          if (pageWidth) state.pageWidth = pageWidth;
          if (pageHeight) state.pageHeight = pageHeight;
          state.baseScale = computeBaseScale(
            state.canvasSize.width,
            state.canvasSize.height,
            state.pageWidth,
            state.pageHeight
          );
          state.totalScale = state.baseScale * (state.zoom / 100);
        }),
    })),
    {
      name: 'canvas-store',
    }
  )
);

// Actions selector — useShallow prevents re-renders when action references haven't changed
export const useCanvasActions = () =>
  useCanvasStore(
    useShallow((state) => ({
      setZoom: state.setZoom,
      setPanOffset: state.setPanOffset,
      setCanvasSize: state.setCanvasSize,
      resetView: state.resetView,
      updateScales: state.updateScales,
    }))
  );
