import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Vector2 } from '@workspace/shared';

interface CanvasState {
  // Zoom and pan state
  zoom: number;
  panOffset: Vector2;
  canvasSize: { width: number; height: number };
  
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

export const useCanvasStore = create<CanvasState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      zoom: 100,
      panOffset: { x: 0, y: 0 },
      canvasSize: { width: 0, height: 0 },
      baseScale: 1,
      totalScale: 1,
      
      // Actions
      setZoom: (zoom) => set((state) => {
        state.zoom = zoom;
        state.totalScale = state.baseScale * (zoom / 100);
      }),
      
      setPanOffset: (offset) => set((state) => {
        state.panOffset = offset;
      }),
      
      setCanvasSize: (size) => set((state) => {
        state.canvasSize = size;
      }),
      
      resetView: () => set((state) => {
        state.zoom = 100;
        state.panOffset = { x: 0, y: 0 };
        state.totalScale = state.baseScale;
      }),
      
      updateScales: (pageWidth?: number, pageHeight?: number) => set((state) => {
        if (!state.canvasSize.width || !state.canvasSize.height || !pageWidth || !pageHeight) {
          state.baseScale = 1;
          state.totalScale = state.zoom / 100;
          return;
        }
        
        // Calculate scale factors for both dimensions
        const padding = 100; // Padding around the page in pixels
        const scaleX = (state.canvasSize.width - padding) / pageWidth;
        const scaleY = (state.canvasSize.height - padding) / pageHeight;
        
        // Use the smaller scale to ensure the entire page fits
        state.baseScale = Math.min(scaleX, scaleY, 1); // Cap at 1 to avoid upscaling small images
        state.totalScale = state.baseScale * (state.zoom / 100);
      }),
    })),
    {
      name: 'canvas-store',
    }
  )
);

// Selectors for common use cases
export const useZoom = () => useCanvasStore((state) => state.zoom);
export const usePanOffset = () => useCanvasStore((state) => state.panOffset);
export const useCanvasSize = () => useCanvasStore((state) => state.canvasSize);
export const useTotalScale = () => useCanvasStore((state) => state.totalScale);
export const useBaseScale = () => useCanvasStore((state) => state.baseScale);

// Actions selector
export const useCanvasActions = () => useCanvasStore((state) => ({
  setZoom: state.setZoom,
  setPanOffset: state.setPanOffset,
  setCanvasSize: state.setCanvasSize,
  resetView: state.resetView,
  updateScales: state.updateScales,
})); 