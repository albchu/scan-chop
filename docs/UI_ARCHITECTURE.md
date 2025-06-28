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
interface FrameData {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;     // relative to page
  orientation: number;  // one of: 0, 90, 180, -90
}
```

### `Vector2`

```ts
// types/geometry.ts
export interface Vector2 {
  x: number;
  y: number;
}
```

---

## 4. ⚙️ UI Context

### `UIContextState`

```ts
interface UIContextSnapshot {
  mode: ToolMode;
  page: PageData;
  frames: Record<string, FrameData>;
  selectedFrameIds: string[]; // ordered selection
  nextFrameNumber: number;
}

interface UIContextState extends UIContextSnapshot {
  history: {
    undoStack: UIContextSnapshot[];
    redoStack: UIContextSnapshot[];
  };
}
```

---

### `UIContextActions`

```ts
interface UIContextActions {
  setMode: (mode: ToolMode) => void;

  addFrame(frame: Omit<FrameData, "id" | "label" | "orientation">): void;
  addMagicFrame(frameLike: Partial<FrameData>): void;

  removeFrame(id: string): void;
  removeFramesBatch(ids: string[]): void;

  updateFrame(id: string, updates: Partial<FrameData>): void;
  renameFrame(id: string, label: string): void;

  selectFrame(id: string): void;        // toggles selection
  clearSelection(): void;

  translateFrameRelative(id: string, vector: Vector2): void;
  rotateFrame(id: string, dAngle: number): void;
  setOrientation(id: string, orientation: 90 | 180 | -90): void;

  saveFrames(ids: string[]): void; // Unified save action

  undo(): void;
  redo(): void;
}
```

---

## 5. 🧠 Geometry Utilities (`utils/geometry.ts`)

```ts
import { Vector2 } from "../types/geometry";

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
// FrameRefRegistryContext.tsx
const FrameRefRegistryContext = createContext<React.MutableRefObject<Record<string, Moveable | null>> | null>(null);

// Used locally, not in UIContext
```

Used for imperative control (e.g. focus, scroll, updateRect) from actions or effects.

---

## 7. 🧩 Shared Hook: `useFrameTransform(id: string)`

```ts
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
├── Canvas
│   └── Page (react-moveable)
│       └── Frame (react-moveable)
│           └── Orientation Arrow
└── FramesPreview
    ├── BatchControls
    └── FrameList
        └── FrameCard
            └── FrameControlPanel
```

---

### 🔸 `FrameCard`

* Visual wrapper for each frame’s UI block
* Uses Tailwind `bg-gray-800 rounded-lg p-4 shadow transition`

---

### 🔸 `FrameControlPanel`

Contains interactive controls:

| Control        | Action                                               |
| -------------- | ---------------------------------------------------- |
| Label Input    | `renameFrame(id, newLabel)`                          |
| Translate ↑↓←→ | `translateFrameRelative(id, vector)` using `Vector2` |
| Rotate ±       | `rotateFrame(id, delta)`                             |
| Orientation    | `setOrientation(id, value)`                          |
| Save Button    | `saveFrames([id])`                                   |
| Delete Button  | `removeFrame(id)`                                    |
| Select Toggle  | `selectFrame(id)`                                    |

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

Inside reducer:

```ts
const rotated = rotateVector(vector, frame.rotation);
frame.x += rotated.x;
frame.y += rotated.y;
```

Moveable component re-renders with new props → smooth transition via Tailwind `transition-transform`.

---

## 🔧 Transform Behavior

| Interaction         | Frame Affected                     |
| ------------------- | ---------------------------------- |
| Move/Resize/Rotate  | Active frame only                  |
| Save / Remove       | Can apply to 1+ selected frames    |
| Orientation         | One frame at a time                |
| Selection Highlight | Shown visually via `ring-*` styles |

---

## 10. 🖼 Styling & Animation

| Element           | Tailwind Classes Used                                         |
| ----------------- | ------------------------------------------------------------- |
| Selected Frame    | `ring-2 ring-indigo-500`                                      |
| FrameCard Hover   | `hover:bg-gray-700 transition`                                |
| Button Actions    | `p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors` |
| Orientation Arrow | `transform rotate-[deg] transition-transform`                 |

---

## 11. 🗂 File Structure

```
src/
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
│   └── FrameRefRegistry.tsx
├── hooks/
│   └── useFrameTransform.ts
├── utils/
│   └── geometry.ts
├── types/
│   ├── UI.ts
│   └── geometry.ts
```
