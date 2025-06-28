# Visual Editor UI Architecture

---

## 1. 🧭 Overview

This React-based visual editor enables users to manage movable/resizable **frames** within a transformable **page**, rendered on a **canvas**. The application supports single-frame transformations, batch save/remove operations via multi-selection, and real-time canvas rendering with animated UI transitions.

The app is styled using **Tailwind CSS**, enhanced with **Tabler Icons**, and powered by `react-moveable`.

---

## 2. ✅ Feature Summary

| Feature                    | Included |
| -------------------------- | -------- |
| Add/Remove Frames          | ✅        |
| Single-frame transform     | ✅        |
| Frame Orientation Arrows   | ✅        |
| Multi-select (save/remove) | ✅        |
| Per-frame Rename           | ✅        |
| Batch and Per-frame Save   | ✅        |
| FrameRef access            | ✅        |
| Smooth UI Animations       | ✅        |
| Unified Save Action        | ✅        |
| Performance optimized      | ✅        |
| Page Zoom/Pan              | ✅        |

---

## 3. 🧱 Core Types

### `FrameData`

```ts
// packages/shared/src/types.ts
interface FrameData {
  id: string;
  label: string;
  x: number;              // X position relative to Page center origin
  y: number;              // Y position relative to Page center origin
  width: number;          // Frame width (minimum: 20)
  height: number;         // Frame height (minimum: 20)
  rotation: number;       // Relative to page (free angle)
  orientation: number;    // "Up" direction indicator: 0, 90, 180, -90
}
```

### `PageData`

```ts
// packages/shared/src/types.ts
interface PageData {
  id: string;
  width: number;
  height: number;
  imageData: string;  // base64 image data
  // TODO: Render imageData as background image in Page component
}
```

### `Vector2`

```ts
// packages/shared/src/types.ts
export interface Vector2 {
  x: number;
  y: number;
}
```

### `ToolMode`

```ts
// packages/shared/src/types.ts
export type ToolMode = 'select' | 'add' | 'pan';
```

### `HistoryEntry`

```ts
// packages/shared/src/types.ts
interface HistoryEntry {
  snapshot: UIContextSnapshot;
  label: string;  // e.g., "Move Frame", "Rotate Frame", "Resize Frame"
}
```

---

## 4. ⚙️ UI Context

The UI Context uses **Immer** for immutable state updates, ensuring predictable state changes and enabling efficient React re-renders.

### `UIContextState`

```ts
// packages/shared/src/types.ts
interface UIContextSnapshot {
  mode: ToolMode;
  page: PageData;
  frames: Record<string, FrameData>;
  selectedFrameIds: string[]; // ordered selection (used for multi-select from FrameList)
  nextFrameNumber: number;
  zoom: number;              // Page zoom level (e.g., 1 = 100%, 0.5 = 50%)
  pan: Vector2;              // Page pan offset
}

interface UIContextState extends UIContextSnapshot {
  history: {
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    maxHistorySize: number; // Default: 16
  };
}
```

---

### `UIContextActions`

```ts
// packages/shared/src/types.ts
interface UIContextActions {
  setMode: (mode: ToolMode) => void;

  addFrame(frame: Omit<FrameData, "id" | "label" | "orientation">): void;
  addMagicFrame(frameLike: Partial<FrameData>): void;  // Currently same as addFrame

  removeFrame(id: string): void;
  removeFramesBatch(ids: string[]): void;

  updateFrame(id: string, updates: Partial<FrameData>): void;
  renameFrame(id: string, label: string): void;

  selectFrame(id: string): void;        // toggles selection (from FrameList only)
  clearSelection(): void;

  translateFrameRelative(id: string, vector: Vector2): void;
  rotateFrame(id: string, dAngle: number): void;
  setOrientation(id: string, orientation: 90 | 180 | -90): void;

  saveFrames(ids: string[]): void; // Logs frame IDs for now

  // Page controls
  setZoom(zoom: number): void;
  setPan(pan: Vector2): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;

  undo(): void;
  redo(): void;
}
```

### State Management with Immer

```ts
// packages/ui/src/context/UIContext.tsx
import { produce } from 'immer';
import type { Moveable } from 'react-moveable';

// Action types for reducer
type Action =
  | { type: 'ADD_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation"> }
  | { type: 'UPDATE_FRAME'; id: string; updates: Partial<FrameData> }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: Vector2 }
  // ... other action types

const MAX_HISTORY_SIZE = 16; // Configurable
const MIN_FRAME_SIZE = 20;

// History management
const pushHistory = (state: UIContextState, label: string): UIContextState => {
  return produce(state, draft => {
    const entry: HistoryEntry = {
      snapshot: {
        mode: state.mode,
        page: state.page,
        frames: state.frames,
        selectedFrameIds: state.selectedFrameIds,
        nextFrameNumber: state.nextFrameNumber,
        zoom: state.zoom,
        pan: state.pan
      },
      label
    };
    
    // Remove oldest if at max capacity
    if (draft.history.undoStack.length >= draft.history.maxHistorySize) {
      draft.history.undoStack.shift();
    }
    
    draft.history.undoStack.push(entry);
    draft.history.redoStack = []; // Clear redo stack on new action
  });
};

// Example reducer action using Immer
const reducer = (state: UIContextState, action: Action): UIContextState => {
  return produce(state, draft => {
    switch (action.type) {
      case 'ADD_FRAME':
        const id = generateId();
        const defaultSize = {
          width: draft.page.width * 0.1,  // 10% of page width
          height: draft.page.height * 0.1  // 10% of page height
        };
        draft.frames[id] = {
          id,
          label: `Frame ${draft.nextFrameNumber}`,
          orientation: 0,
          ...defaultSize,
          ...action.payload
        };
        draft.nextFrameNumber++;
        break;
        
      case 'UPDATE_FRAME':
        if (draft.frames[action.id]) {
          // Enforce minimum dimensions
          if (action.updates.width !== undefined) {
            action.updates.width = Math.max(action.updates.width, MIN_FRAME_SIZE);
          }
          if (action.updates.height !== undefined) {
            action.updates.height = Math.max(action.updates.height, MIN_FRAME_SIZE);
          }
          Object.assign(draft.frames[action.id], action.updates);
        }
        break;

      case 'SET_ZOOM':
        draft.zoom = action.zoom;
        break;

      case 'SET_PAN':
        draft.pan = action.pan;
        break;
        
      // ... other actions
    }
  });
};

// Save frames implementation
const saveFrames = (ids: string[]) => {
  console.log('Saving frames:', ids);
  // TODO: Future implementation will trigger extraction logic
};
```

---

## 5. 🧠 Geometry Utilities (`packages/ui/src/utils/geometry.ts`)

```ts
import { Vector2 } from "@workspace/shared";

export function rotateVector(vector: Vector2, degrees: number): Vector2 {
  const { x, y } = vector;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: Math.round(x * cos - y * sin),
    y: Math.round(x * sin + y * cos),
  };
}
```

---

## 6. 🔁 FrameRef Registry

```ts
// packages/ui/src/context/FrameRefRegistryContext.tsx
import type { Moveable } from 'react-moveable';

const FrameRefRegistryContext = createContext<React.MutableRefObject<Record<string, Moveable | null>> | null>(null);

// Used locally, not in UIContext
```

Used for imperative control (e.g. focus, scroll, updateRect) from actions or effects.

---

## 7. 🧩 Shared Hook: `useFrameTransform(id: string)`

```ts
// packages/ui/src/hooks/useFrameTransform.ts
interface UseFrameTransformReturn {
  frame: FrameData;
  transformStyle: string;     // `translate(...) rotate(...)`
  arrowRotation: number;      // frame.rotation + frame.orientation
  isSelected: boolean;
}
```

Used by both `Frame.tsx` and `FrameControlPanel.tsx`.

---

## 8. 🧱 Component Architecture

```plaintext
Editor
├── UIContextProvider
├── FrameRefRegistryProvider
├── Sidebar
│   ├── Tool Selection
│   └── Page Controls (Zoom/Pan)
├── Canvas (2x Page dimensions)
│   └── Page (react-moveable group parent, overflow: hidden)
│       └── Frame (react-moveable groupable child)
│           └── Orientation Arrow (from frame origin)
└── FramesPreview
    ├── BatchControls
    └── FrameList (handles multi-selection)
        └── FrameCard
            └── FrameControlPanel
```

---

### 🔸 `Canvas`

* Container element with dimensions 2x the Page size for pan/zoom space
* Handles tool mode interactions (select, add, pan)
* Changes cursor based on active tool mode

---

### 🔸 `Page`

* Container for the scanned image
* Maintains aspect ratio based on `PageData.width` and `PageData.height`
* Acts as react-moveable group parent for all frames
* `overflow: hidden` to clip frames extending beyond boundaries
* Origin (0,0) at center for frame coordinates
* TODO: Render `PageData.imageData` as background

---

### 🔸 `Frame`

* Moveable/resizable element with free rotation (no snapping)
* Minimum size: 20x20 pixels
* Can overlap with other frames (click selects topmost)
* Clipped by Page boundaries (overflow hidden)
* Contains orientation arrow from origin point

---

### 🔸 `Tool Mode Behaviors`

#### Select Mode
- Single click on frame selects it
- Click on empty space deselects
- Only one frame selected at a time in canvas

#### Add Mode  
- Click to place frame at 10% of page dimensions
- Click and drag to create custom sized frame
- New frames placed at click position (relative to Page center)

#### Pan Mode
- Changes cursor to grab/grabbing
- Click and drag to pan the Page within Canvas

---

### 🔸 `Sidebar`

Contains:

| Control        | Action                                               |
| -------------- | ---------------------------------------------------- |
| Select Tool    | `setMode('select')`                                  |
| Add Tool       | `setMode('add')`                                     |
| Pan Tool       | `setMode('pan')`                                     |
| Zoom In        | `zoomIn()` - increases zoom by preset increment      |
| Zoom Out       | `zoomOut()` - decreases zoom by preset increment     |
| Reset View     | `resetView()` - resets zoom to 1 and pan to (0,0)   |
| Zoom Slider    | `setZoom(value)` - direct zoom control               |

---

### 🔸 `FrameCard`

* Visual wrapper for each frame's UI block
* Uses Tailwind `bg-gray-800 rounded-lg p-4 shadow transition`

---

### 🔸 `FrameControlPanel`

Contains interactive controls:

| Control        | Action                                               |
| -------------- | ---------------------------------------------------- |
| Label Input    | `renameFrame(id, newLabel)`                          |
| Translate ↑↓←→ | `translateFrameRelative(id, vector)` using `Vector2` |
| Rotate ±       | `rotateFrame(id, delta)`                             |
| Orientation    | `setOrientation(id, value)` - sets "up" direction    |
| Save Button    | `saveFrames([id])`                                   |
| Delete Button  | `removeFrame(id)`                                    |
| Select Toggle  | `selectFrame(id)` - for multi-selection              |

---

### 🔸 `BatchControls`

| Button        | Behavior                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| Save Frames   | If selection is empty: `saveFrames(allFrameIds)`<br>Else: `saveFrames(selectedFrameIds)` |
| Remove Frames | `removeFramesBatch(selectedFrameIds)` if selected                                        |

---

## 9. 🧮 Frame Translation Flow (Single Frame Only)

```ts
// From FrameControlPanel
translateFrameRelative(id, { x: 0, y: -10 });
```

Inside reducer with Immer:

```ts
produce(state, draft => {
  const frame = draft.frames[id];
  if (frame) {
    const rotated = rotateVector(vector, frame.rotation);
    frame.x += rotated.x;
    frame.y += rotated.y;
  }
});
```

Moveable component re-renders with new props → smooth transition via Tailwind `transition-transform`.

---

## 🔧 Transform Behavior

| Interaction         | Frame Affected                     | Notes |
| ------------------- | ---------------------------------- | ----- |
| Move/Resize/Rotate  | Active frame only                  | Free rotation, no snapping |
| Save / Remove       | Can apply to 1+ selected frames    | Multi-select from FrameList only |
| Orientation         | One frame at a time                | Fixed angles: 0°, 90°, 180°, -90° |
| Selection Highlight | Shown visually via `ring-*` styles | Canvas: single selection only |
| Page Zoom/Pan       | All frames move relative to page   | Frames are groupable children |

### Rotation vs Orientation

- **Rotation**: Free angle transformation of the frame relative to the page
- **Orientation**: Indicates the "up" direction within the frame (for future image extraction)
  - Shown as arrow from frame origin
  - Arrow points up at 0° orientation
  - Will be used to correct image orientation during extraction
  - Does not affect frame's visual rotation

### History-Tracked Actions

Actions that create history entries (with labels):
- Frame translation → "Move Frame"
- Frame rotation → "Rotate Frame"  
- Frame resize → "Resize Frame"
- Orientation change → "Change Orientation"
- Label update → "Rename Frame"

---

## 10. 🖼 Styling & Animation

| Element           | Tailwind Classes Used                                         |
| ----------------- | ------------------------------------------------------------- |
| Selected Frame    | `ring-2 ring-indigo-500`                                      |
| FrameCard Hover   | `hover:bg-gray-700 transition`                                |
| Button Actions    | `p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors` |
| Orientation Arrow | `transform rotate-[deg] transition-transform`                 |
| Page Container    | `transform-origin-center transition-transform overflow-hidden` |
| Canvas Container  | `relative overflow-auto cursor-[mode]`                        |

---

## 11. 📏 Constants

```ts
// packages/shared/src/constants.ts
export const MIN_FRAME_SIZE = 20;
export const DEFAULT_FRAME_SIZE_RATIO = 0.1; // 10% of page dimensions
export const ZOOM_INCREMENT = 0.1;
export const MIN_ZOOM = 0.1;
export const CANVAS_SIZE_MULTIPLIER = 2; // Canvas is 2x page size
export const MAX_HISTORY_SIZE = 16;
```

---

## 12. 🗂 File Structure

```
packages/ui/src/
├── components/
│   ├── Editor.tsx
│   ├── Sidebar.tsx
│   ├── Canvas.tsx
│   ├── Page.tsx
│   ├── Frame.tsx
│   └── FramesPreview/
│       ├── FramesPreview.tsx
│       ├── BatchControls.tsx
│       ├── FrameList.tsx
│       ├── FrameCard.tsx
│       └── FrameControlPanel.tsx
├── context/
│   ├── UIContext.tsx
│   └── FrameRefRegistryContext.tsx
├── hooks/
│   ├── useFrameTransform.ts
│   ├── useBackend.ts
│   └── useReactiveSelector.ts
└── utils/
    └── geometry.ts

packages/shared/src/
├── types.ts          → FrameData, PageData, Vector2, ToolMode, UIContextState, UIContextActions, HistoryEntry, etc.
├── constants.ts      → MIN_FRAME_SIZE, DEFAULT_FRAME_SIZE_RATIO, zoom values, etc.
├── api.ts           → BackendAPI interface (existing)
└── index.ts         → Re-exports
```
