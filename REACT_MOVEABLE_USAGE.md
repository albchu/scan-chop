# React Moveable Integration Guide for Visual Editor

## Overview

This document clarifies how `react-moveable` should be integrated into the visual editor UI architecture to achieve the frame manipulation experience. Based on the moveable library documentation and examples, this guide provides specific implementation patterns for our use case.

## Key Concepts from React Moveable

### 1. Core Abilities We'll Use

Based on our UI architecture requirements:

- **Draggable**: For moving frames within the page bounds
- **Resizable**: For adjusting frame dimensions
- **Rotatable**: For free-angle rotation
- **Snappable**: (Future consideration for alignment guides)

### 2. Important Props and Events

```tsx
interface MoveableProps {
  // Target element(s)
  target: HTMLElement | SVGElement | Array<HTMLElement | SVGElement> | string;
  
  // Container for the control box (null = fixed position)
  container?: HTMLElement | null;
  
  // Abilities
  draggable?: boolean;
  resizable?: boolean;
  rotatable?: boolean;
  
  // Constraints
  bounds?: { left: number; top: number; right: number; bottom: number } | HTMLElement;
  
  // Control box customization
  renderDirections?: Array<"n" | "nw" | "ne" | "s" | "se" | "sw" | "e" | "w">;
  className?: string;
  
  // Event handlers
  onDrag?: (e: OnDrag) => void;
  onDragEnd?: (e: OnDragEnd) => void;
  onResize?: (e: OnResize) => void;
  onResizeEnd?: (e: OnResizeEnd) => void;
  onRotate?: (e: OnRotate) => void;
  onRotateEnd?: (e: OnRotateEnd) => void;
}
```

## Integration with UI Architecture

### 1. Frame Component Implementation

The `Frame` component should integrate Moveable as follows:

```tsx
// packages/ui/src/components/Frame.tsx
import React, { useRef, useEffect } from 'react';
import Moveable from 'react-moveable';
import { useUIContext } from '../context/UIContext';
import { useFrameTransform } from '../hooks/useFrameTransform';
import { FrameData } from '@workspace/shared';

interface FrameProps {
  id: string;
  isActive: boolean; // Only true when single-selected
}

export const Frame: React.FC<FrameProps> = ({ id, isActive }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const { updateFrame } = useUIContext();
  const { frame, transformStyle, arrowRotation, isSelected, selectionType } = useFrameTransform(id);

  // Register frame ref for external control
  useEffect(() => {
    if (moveableRef.current) {
      // Register in FrameRefRegistry
    }
  }, [id]);

  const handleDrag = (e: any) => {
    const { left, top } = e;
    
    // Validate bounds (0 to page dimensions)
    const newX = Math.max(0, Math.min(left, pageWidth));
    const newY = Math.max(0, Math.min(top, pageHeight));
    
    updateFrame(id, { x: newX, y: newY }, 'Move Frame');
  };

  const handleResize = (e: any) => {
    const { width, height, drag } = e;
    const { left, top } = drag;
    
    // Validate position stays in bounds
    const newX = Math.max(0, Math.min(left, pageWidth));
    const newY = Math.max(0, Math.min(top, pageHeight));
    
    updateFrame(id, {
      x: newX,
      y: newY,
      width: Math.max(MIN_FRAME_SIZE, width),
      height: Math.max(MIN_FRAME_SIZE, height)
    }, 'Resize Frame');
  };

  const handleRotate = (e: any) => {
    const { rotation } = e;
    updateFrame(id, { rotation }, 'Rotate Frame');
  };

  return (
    <>
      <div
        ref={frameRef}
        data-frame-id={id}
        className={`
          absolute transition-transform
          ${isSelected ? (selectionType === 'single' ? 'ring-2 ring-blue-500' : 'ring-2 ring-indigo-500 ring-dashed') : ''}
        `}
        style={{
          transform: transformStyle,
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          left: `${frame.x}px`,
          top: `${frame.y}px`,
        }}
      >
        {/* Frame content */}
        <div className="relative w-full h-full">
          {/* Orientation Arrow */}
          <div 
            className="absolute top-2 left-1/2 -translate-x-1/2"
            style={{ transform: `rotate(${frame.orientation}deg)` }}
          >
            ↑
          </div>
        </div>
      </div>
      
      {isActive && (
        <Moveable
          ref={moveableRef}
          target={frameRef}
          container={null} // Fixed positioning
          
          // Abilities
          draggable={true}
          resizable={true}
          rotatable={true}
          
          // Constraints
          bounds={{
            left: 0,
            top: 0,
            right: pageWidth,
            bottom: pageHeight
          }}
          
          // No snapping for free rotation
          rotationSnap={0}
          
          // Event handlers
          onDrag={handleDrag}
          onDragEnd={handleDrag}
          onResize={handleResize}
          onResizeEnd={handleResize}
          onRotate={handleRotate}
          onRotateEnd={handleRotate}
          
          // Styling
          className="moveable-frame"
        />
      )}
    </>
  );
};
```

### 2. Key Implementation Details

#### Bounds Validation

Since only x,y coordinates must stay within page bounds:

```tsx
// In drag handler
const validatePosition = (x: number, y: number) => {
  return {
    x: Math.max(0, Math.min(x, pageWidth)),
    y: Math.max(0, Math.min(y, pageHeight))
  };
};
```

#### Transform Management

Moveable provides transform strings, but we need to manage our state separately:

```tsx
// Don't use e.transform directly
// Instead, update our state and let React re-render
updateFrame(id, { rotation: e.rotation }, 'Rotate Frame');
```

#### Selection State

Only render Moveable when frame is active (single-selected):

```tsx
{isActive && <Moveable ... />}
```

### 3. Canvas Click Handling

For frame selection in the Canvas component:

```tsx
// packages/ui/src/components/Canvas.tsx
const handleCanvasClick = (e: React.MouseEvent) => {
  // Find frame via data attribute
  const frameElement = e.target.closest('[data-frame-id]');
  
  if (frameElement) {
    const frameId = frameElement.getAttribute('data-frame-id');
    if (mode === 'select' && frameId) {
      selectFrame(frameId);
    }
  } else if (e.target.closest('[data-page="true"]')) {
    if (mode === 'add') {
      // Add frame at click position
      const rect = pageElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addFrame({ x, y, width: defaultWidth, height: defaultHeight });
    } else {
      clearSelection();
    }
  }
};
```

### 4. Rotation Increment Implementation

For the FrameControlPanel rotation buttons:

```tsx
// packages/ui/src/components/FrameControlPanel.tsx
const handleRotateIncrement = (delta: number) => {
  const currentRotation = frame.rotation || 0;
  const newRotation = currentRotation + delta;
  updateFrame(id, { rotation: newRotation }, `Rotate Frame ${frame.label}`);
};

// In the UI
<button onClick={() => handleRotateIncrement(-ROTATION_INCREMENT)}>-</button>
<button onClick={() => handleRotateIncrement(ROTATION_INCREMENT)}>+</button>
```

### 5. CSS Customization

Add custom styles for the moveable control box:

```css
/* packages/ui/src/styles/moveable.css */
.moveable-frame .moveable-control {
  width: 12px !important;
  height: 12px !important;
  margin-top: -6px !important;
  margin-left: -6px !important;
}

.moveable-frame .moveable-line {
  background: #3b82f6 !important; /* Tailwind blue-500 */
}

.moveable-frame .moveable-rotation-line {
  height: 30px !important;
}
```

## Important Considerations

### 1. Event Handling Order

Moveable events fire in this sequence:
- `onDragStart` → `onDrag` (multiple times) → `onDragEnd`
- We should update state in the main event handlers (`onDrag`, `onResize`, `onRotate`)

### 2. Performance Optimization

- Use `throttle` props if needed: `throttleDrag`, `throttleResize`, `throttleRotate`
- Consider using `React.memo` for Frame components
- Only render Moveable for active frames

### 3. Transform Coordination

- Let our state drive the transform, not Moveable's transform string
- This ensures consistency with our undo/redo system

### 4. Group Selection

For our use case, we don't use Moveable's group functionality. Instead:
- Multi-selection is for batch operations only (save/delete)
- Only single-selected frames show Moveable controls

### 5. Ref Management

The FrameRefRegistry should store Moveable refs, not DOM refs:

```tsx
const frameRefs = useRef<Record<string, Moveable | null>>({});
```

## Assumptions Confirmed

Based on the moveable library analysis:

1. **Free Rotation**: Set `rotationSnap={0}` for no snapping
2. **Bounds**: Use the `bounds` prop with coordinates matching page dimensions
3. **Transform Application**: We manage transforms through our state, not directly applying Moveable's transform strings
4. **Single vs Group**: We use single Moveable instances per frame, not group mode
5. **Click Detection**: Use data attributes on frame elements for selection
6. **Fixed Positioning**: Set `container={null}` for fixed positioning of control box

## Future Enhancements

1. **Snap Guidelines**: Can add `snappable` prop with element/grid guidelines
2. **Keyboard Controls**: Can use `dragStart()` method for keyboard-driven movement
3. **Custom Handles**: Use `renderDirections` to show/hide specific resize handles
4. **Visual Feedback**: Can use `onDragStart`, `onResizeStart` events for additional UI feedback 