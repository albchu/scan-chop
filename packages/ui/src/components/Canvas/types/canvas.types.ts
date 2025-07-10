export interface DragState {
  x: number;
  y: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasTransform {
  panOffset: PanOffset;
  scale: number;
}

export type CursorStyle = 'cursor-grab' | 'cursor-grabbing select-none';

export interface CanvasInteractionState {
  isDragging: boolean;
  dragStart: DragState;
  isCommandPressed: boolean;
} 