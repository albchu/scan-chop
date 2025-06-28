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

---

## 3. 🧱 Core Types

### `FrameData`

```ts
// packages/shared/src/types.ts
interface FrameData {
  id: string;             // Sequential ID (e.g., "frame-1", "frame-2")
  label: string;
  x: number;              // X position relative to Page top-left origin (0 to page.width)
  y: number;              // Y position relative to Page top-left origin (0 to page.height)
  width: number;          // Frame width (minimum: 20)
  height: number;         // Frame height (minimum: 20)
  rotation: number;       // Relative to page (free angle, no snapping), rotation center is frame center
  orientation: 0 | 90 | 180 | -90;  // "Up" direction indicator, 0 is default
}
```

### `PageData`

```ts
// packages/shared/src/types.ts
interface PageData {
  id: string;
  width: number;      // Set to match image dimensions
  height: number;     // Set to match image dimensions
  imageData: string;  // base64 image data, rendered at 1:1 scale
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
export type ToolMode = 'select' | 'add';
```

### `HistoryEntry`

```ts
// packages/shared/src/types.ts
interface HistoryEntry {
  snapshot: UIContextSnapshot;
  label: string;  // e.g., "Move Frame 1", "Rotate Frame 3", "Resize Frame 2"
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
  selectedFrameIds: string[]; // Multi-selection for batch operations
  nextFrameNumber: number;
}

interface UIContextState extends UIContextSnapshot {
  history: {
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
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
  | { type: 'UPDATE_FRAME'; id: string; updates: Partial<FrameData>; historyLabel: string }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'RENAME_FRAME'; id: string; label: string }
  | { type: 'SELECT_FRAME'; id: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_MODE'; mode: ToolMode }
  | { type: 'SET_ORIENTATION'; id: string; orientation: 90 | 180 | -90 }
  // ... other action types

const MAX_HISTORY_SIZE = 16;
const MIN_FRAME_SIZE = 20;
const TRANSLATION_STEP = 10; // pixels
const ROTATION_INCREMENT = 0.5; // degrees

// Validate frame bounds - only x,y coordinates must stay within page
const isFrameWithinBounds = (frame: Partial<FrameData>, page: PageData): boolean => {
  if (frame.x !== undefined && (frame.x < 0 || frame.x > page.width)) return false;
  if (frame.y !== undefined && (frame.y < 0 || frame.y > page.height)) return false;
  return true;
};

// Generate sequential frame ID
const generateId = (() => {
  let counter = 0;
  return () => `frame-${++counter}`;
})();

// History management
const pushHistory = (state: UIContextState, label: string): UIContextState => {
  return produce(state, draft => {
    const entry: HistoryEntry = {
      snapshot: {
        mode: state.mode,
        page: state.page,
        frames: state.frames,
        selectedFrameIds: state.selectedFrameIds,
        nextFrameNumber: state.nextFrameNumber
      },
      label
    };
    
    // Remove oldest if at max capacity
    if (draft.history.undoStack.length >= MAX_HISTORY_SIZE) {
      draft.history.undoStack.shift();
    }
    
    draft.history.undoStack.push(entry);
    draft.history.redoStack = []; // Clear redo stack on new action
  });
};

// Example reducer action using Immer
const reducer = (state: UIContextState, action: Action): UIContextState => {
  let newState = state;
  
  switch (action.type) {
    case 'ADD_FRAME':
      newState = produce(state, draft => {
        const id = generateId();
        const defaultSize = {
          width: draft.page.width * 0.1,  // 10% of page width
          height: draft.page.height * 0.1  // 10% of page height
        };
        // Ensure frame position stays within page bounds
        const frame = {
          id,
          label: `Frame ${draft.nextFrameNumber}`,
          orientation: 0,
          ...defaultSize,
          ...action.payload
        };
        frame.x = Math.max(0, Math.min(frame.x, draft.page.width));
        frame.y = Math.max(0, Math.min(frame.y, draft.page.height));
        draft.frames[id] = frame;
        draft.nextFrameNumber++;
      });
      return pushHistory(newState, `Add Frame ${newState.nextFrameNumber - 1}`);
      
    case 'UPDATE_FRAME':
      newState = produce(state, draft => {
        if (draft.frames[action.id]) {
          const currentFrame = draft.frames[action.id];
          const updatedFrame = { ...currentFrame, ...action.updates };
          
          // Enforce minimum dimensions
          if (updatedFrame.width < MIN_FRAME_SIZE) updatedFrame.width = MIN_FRAME_SIZE;
          if (updatedFrame.height < MIN_FRAME_SIZE) updatedFrame.height = MIN_FRAME_SIZE;
          
          // Validate frame position stays within bounds (width/height can exceed)
          if (!isFrameWithinBounds(updatedFrame, draft.page)) {
            // Reject update if position would exceed page bounds
            return;
          }
          
          draft.frames[action.id] = updatedFrame;
        }
      });
      if (newState !== state) {
        return pushHistory(newState, action.historyLabel);
      }
      return state;

    case 'REMOVE_FRAME':
      newState = produce(state, draft => {
        const frameLabel = draft.frames[action.id]?.label || action.id;
        delete draft.frames[action.id];
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => id !== action.id);
      });
      return pushHistory(newState, `Remove ${state.frames[action.id]?.label || 'Frame'}`);

    case 'RENAME_FRAME':
      newState = produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].label = action.label;
        }
      });
      return pushHistory(newState, `Rename Frame ${action.id}`);

    case 'SELECT_FRAME':
      return produce(state, draft => {
        const frameIndex = draft.selectedFrameIds.indexOf(action.id);
        if (frameIndex === -1) {
          draft.selectedFrameIds.push(action.id);
        } else {
          draft.selectedFrameIds.splice(frameIndex, 1);
        }
      });

    case 'CLEAR_SELECTION':
      return produce(state, draft => {
        draft.selectedFrameIds = [];
      });

    case 'SET_MODE':
      return produce(state, draft => {
        draft.mode = action.mode;
        // Clear selection when switching tools
        draft.selectedFrameIds = [];
      });

    case 'SET_ORIENTATION':
      newState = produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].orientation = action.orientation;
        }
      });
      return pushHistory(newState, `Change Orientation Frame ${action.id}`);
      
    // ... other actions
  }
  
  return state;
};

// Action creators that use the reducer
const translateFrameRelative = (id: string, vector: Vector2) => {
  dispatch({ 
    type: 'UPDATE_FRAME', 
    id, 
    updates: { 
      x: currentFrame.x + vector.x, 
      y: currentFrame.y + vector.y 
    },
    historyLabel: `Move Frame ${id}`
  });
};

// Save frames implementation
const saveFrames = (ids: string[]) => {
  console.log('Saving frames:', ids);
  // Future implementation will trigger extraction logic
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

// Used for imperative frame control from FrameControlPanel selection
```

The FrameRef Registry is used to:
- Programmatically select/deselect frames when checkbox is clicked in FrameControlPanel
- Update visual selection state on Frame components
- Coordinate selection between Canvas and FrameList views

---

## 7. 🧩 Shared Hook: `useFrameTransform(id: string)`

```ts
// packages/ui/src/hooks/useFrameTransform.ts
interface UseFrameTransformReturn {
  frame: FrameData;
  transformStyle: string;     // `translate(...) rotate(...)`
  arrowRotation: number;      // frame.rotation + frame.orientation
  isSelected: boolean;
  selectionType: 'none' | 'single' | 'batch';  // single when only 1 selected, batch when multiple
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
│   └── Tool Selection
├── Canvas
│   └── Page (container with bounds, overflow: hidden, data-page="true")
│       └── Frame (individual react-moveable component)
│           └── Orientation Arrow (relative to frame, rotated by orientation degrees)
└── FramesPreview
    ├── BatchControls (shows selection count)
    └── FrameList
        └── FrameCard (reflects selection state)
            └── FrameControlPanel (includes selection checkbox)
```

---

### 🔸 `Canvas`

* Container element for the page
* Handles tool mode interactions (select, add)
* Changes cursor based on active tool mode

---

### 🔸 `Page`

* Container for the scanned image and frames
* Fixed dimensions based on `PageData.width` and `PageData.height` (matching image dimensions)
* Renders `PageData.imageData` as background at 1:1 scale (no stretching/skewing)
* Acts as boundary container for frame positions (x,y)
* `overflow: hidden` to clip frames extending beyond boundaries
* Origin (0,0) at top-left corner
* Has `data-page="true"` attribute for click detection in add mode

---

### 🔸 `Frame`

* Individual `Moveable` component
* Moveable/resizable element with free rotation (no snapping)
* Rotation center is frame center
* Minimum size: 20x20 pixels
* Can overlap with other frames
* Position (x,y) constrained to page bounds, but size/rotation can exceed
* Clipped visually by Page boundaries (overflow hidden)
* Contains orientation arrow as child element
* Different visual states for selection types
* Has `data-frame-id="[id]"` attribute for click detection

---

### 🔸 `Orientation Arrow`

* Child element of Frame component
* Renders pointing "up" when orientation = 0
* Rotated by `orientation` degrees relative to the Frame
* Inherits Frame's rotation, so total visual rotation = frame.rotation + orientation

---

### 🔸 `Tool Mode Behaviors`

#### Select Mode
- Click on frame to select it (adds to selectedFrameIds)
- When clicking overlapping frames, selects the first frame found via `data-frame-id` attribute in event target hierarchy
- When only 1 frame selected: can transform (move/resize/rotate)
- When multiple frames selected: batch operations only
- Click on empty space deselects all
- Switching tools clears all selections
- Multi-selection only via checkboxes in FrameControlPanel

#### Add Mode  
- Click to place frame at click position (top-left corner)
- Only valid when click target or its ancestors have `data-page="true"`
- Default size: 10% of page dimensions
- Frame position (x,y) constrained to stay within page bounds
- Switching tools clears all selections

---

### 🔸 `Sidebar`

Contains:

| Control        | Action                                               |
| -------------- | ---------------------------------------------------- |
| Select Tool    | `setMode('select')`                                  |
| Add Tool       | `setMode('add')`                                     |

---

### 🔸 `FrameCard`

* Visual wrapper for each frame's UI block
* Uses Tailwind `bg-gray-800 rounded-lg p-4 shadow transition`
* Shows selection state visually based on selection type

---

### 🔸 `FrameControlPanel`

Contains interactive controls:

| Control        | Action                                               |
| -------------- | ---------------------------------------------------- |
| Selection Box  | Checkbox for frame selection in batch operations     |
| Label Input    | `renameFrame(id, newLabel)`                          |
| Translate ↑↓←→ | `translateFrameRelative(id, vector)` with step = 10px |
| Rotate ±       | `rotateFrame(id, ±0.5)` - increments by 0.5 degrees  |
| Orientation    | `setOrientation(id, value)` - sets "up" direction (90, 180, -90) |
| Save Button    | `saveFrames([id])`                                   |
| Delete Button  | `removeFrame(id)`                                    |

---

### 🔸 `BatchControls`

| Control       | Behavior                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| Selection Info | Shows "X frames selected"                                                               |
| Save Frames   | If selection is empty: `saveFrames(allFrameIds)`<br>Else: `saveFrames(selectedFrameIds)` |
| Remove Frames | `removeFramesBatch(selectedFrameIds)` if selected                                        |

---

## 9. 🧮 Frame Translation Flow (Single Frame Only)

```ts
// From FrameControlPanel arrow buttons
translateFrameRelative(id, { x: 0, y: -TRANSLATION_STEP });
```

Inside reducer with Immer:

```ts
produce(state, draft => {
  const frame = draft.frames[id];
  if (frame) {
    // Translation is relative to frame's current rotation
    const rotated = rotateVector(vector, frame.rotation);
    const newX = frame.x + rotated.x;
    const newY = frame.y + rotated.y;
    
    // Validate new position stays within bounds (0 to page dimensions)
    if (newX >= 0 && newX <= draft.page.width && 
        newY >= 0 && newY <= draft.page.height) {
      frame.x = newX;
      frame.y = newY;
    }
  }
});
```

Moveable component re-renders with new props → smooth transition via Tailwind `transition-transform`.

---

## 🔧 Transform Behavior

| Interaction         | Frame Affected                     | Notes |
| ------------------- | ---------------------------------- | ----- |
| Move/Resize/Rotate  | Single active frame only           | Only when 1 frame selected |
| Save / Remove       | Can apply to multiple selected frames | Multi-select via checkboxes only |
| Orientation         | One frame at a time                | Fixed angles: 90°, 180°, -90° (0° is default) |
| Selection Highlight | Visual indicator on selected frames | Different states for single vs batch |

### Rotation vs Orientation

- **Rotation**: Free angle transformation of the frame relative to the page
  - No snapping behavior
  - Rotation center is frame center
  - Applied to entire Frame component
  - Controlled via ±0.5° increment buttons
- **Orientation**: Indicates the "up" direction within the frame (for future image extraction)
  - Shown as arrow child element of frame
  - Arrow points up at 0° orientation (default)
  - Can be set to 90°, 180°, or -90° via UI
  - Rotated relative to frame's rotation
  - Will be used to correct image orientation during extraction

### History-Tracked Actions

Actions that create history entries (with specific frame labels):
- Frame translation → "Move Frame X"
- Frame rotation → "Rotate Frame X"  
- Frame resize → "Resize Frame X"
- Orientation change → "Change Orientation Frame X"
- Label update → "Rename Frame X"
- Frame addition → "Add Frame X"
- Frame removal → "Remove Frame X"

### Selection States

Frames can be in one of three selection states:
1. **None**: Not selected
2. **Single**: Only frame selected (transformation enabled)
3. **Batch**: One of multiple selected (transformation disabled, batch operations enabled)

---

## 10. 🖼 Styling & Animation

| Element           | Tailwind Classes Used                                         |
| ----------------- | ------------------------------------------------------------- |
| Frame (Single Selected) | `ring-2 ring-blue-500`                                   |
| Frame (Batch Selected) | `ring-2 ring-indigo-500 ring-dashed`                     |
| FrameCard Selected | `border-2 border-indigo-500`                                 |
| FrameCard Hover   | `hover:bg-gray-700 transition`                                |
| Button Actions    | `p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors` |
| Orientation Arrow | `transform rotate-[deg] transition-transform`                 |
| Page Container    | `relative overflow-hidden bg-gray-100`                        |
| Canvas Container  | `relative overflow-auto cursor-[mode]`                        |

---

## 11. 📏 Constants

```ts
// packages/shared/src/constants.ts
export const MIN_FRAME_SIZE = 20;
export const DEFAULT_FRAME_SIZE_RATIO = 0.1; // 10% of page dimensions
export const MAX_HISTORY_SIZE = 16;
export const TRANSLATION_STEP = 10; // pixels for arrow key movement
export const ROTATION_INCREMENT = 0.5; // degrees for rotation buttons
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
├── constants.ts      → MIN_FRAME_SIZE, DEFAULT_FRAME_SIZE_RATIO, TRANSLATION_STEP, ROTATION_INCREMENT, MAX_HISTORY_SIZE, etc.
├── api.ts           → BackendAPI interface (existing)
└── index.ts         → Re-exports
```
