export interface Vector2 {
  x: number;
  y: number;
}

export interface ZoomContextState {
  zoom: number;
  baseScale: number;
  totalScale: number;
  panOffset: Vector2;
  canvasSize: { width: number; height: number };
}

export interface ZoomContextActions {
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Vector2) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  resetView: () => void;
}

export type ZoomContextValue = ZoomContextState & ZoomContextActions; 