// Core data types
export interface Vector2 {
  x: number;
  y: number;
}

export interface FrameData {
  id: string;             // Sequential ID (e.g., "frame-1", "frame-2")
  label: string;
  x: number;              // X position relative to Page top-left origin (0 to page.width)
  y: number;              // Y position relative to Page top-left origin (0 to page.height)
  width: number;          // Frame width (minimum: 20)
  height: number;         // Frame height (minimum: 20)
  rotation: number;       // Relative to page (free angle, no snapping), rotation center is frame center
  orientation: 0 | 90 | 180 | -90;  // "Up" direction indicator, 0 is default
}

export interface PageData {
  id: string;
  width: number;      // Set to match image dimensions
  height: number;     // Set to match image dimensions
  imageData: string;  // base64 image data, rendered at 1:1 scale
}

// UI Context types
export interface UIContextSnapshot {
  page: PageData;
  frames: Record<string, FrameData>;
  selectedFrameIds: string[]; // Multi-selection for batch operations
  nextFrameNumber: number;
}

export interface UIContextState extends UIContextSnapshot {
}

export interface UIContextActions {
  addFrame(frame: Omit<FrameData, "id" | "label" | "orientation">): void;
  addMagicFrame(frame: Omit<FrameData, "id" | "label" | "orientation">): void;

  removeFrame(id: string): void;
  removeFramesBatch(ids: string[]): void;

  updateFrame(id: string, updates: Partial<FrameData>): void;
  renameFrame(id: string, label: string): void;

  selectFrame(id: string): void;        // Toggles selection for batch operations
  clearSelection(): void;

  translateFrameRelative(id: string, vector: Vector2): void;
  rotateFrame(id: string, dAngle: number): void;
  setOrientation(id: string, orientation: 90 | 180 | -90): void;

  saveFrames(ids: string[]): void; // Logs frame IDs for now
}

// Legacy types (kept for backward compatibility)
export interface AppState extends Record<string, any> {
  counter: number;
}

export type Action =
  | { type: 'incrementCounter' }
  | { type: 'resetApp' }; 