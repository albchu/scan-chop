import React, { useCallback, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate, OnDragStart, OnDragEnd } from 'react-moveable';
import { FrameData } from '@workspace/shared';

interface FrameProps {
  frame: FrameData;
  updateFrame: (id: string, updates: Partial<FrameData>) => void;
}

const RENDER_DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

// TODO: Might need to debounce updateFrame later if rendering gets chuggy with a lot of frames. Lez find out.
export const Frame: React.FC<FrameProps> = ({ frame, updateFrame }) => {
  // The frame position, size, and rotation can be initialized from frame data but frame data
  // cannot actively drive the moveable component because the moveable component is driving
  // and needs instant UI feedback to drive the experience.
  const {
    id,
    label,
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
    rotation: initialRotation,
  } = frame;

  // TODO: Figure out parity with features I want from frame.
  // Control panel can be mostly removed as I move to finalize that design. Is just metadata I need to show on a list.
  // The list can have different view types.

  const targetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    `translate(${initialX}px, ${initialY}px) rotate(${initialRotation}deg)`
  );
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [rotation, setRotation] = useState(initialRotation);

  const handleDragStart = useCallback(({target}: OnDragStart) => {
    if (target) {
      target.classList.add('cursor-grabbing');
      target.classList.remove('cursor-grab');
    }
  }, []);

  const handleDrag = useCallback(({target, transform, translate, width, height}: OnDrag) => {
    if (target && transform) {
      target.style.transform = transform;
      // Cursor should already be grabbing from dragStart
      const [x, y] = translate;
      setTransform(transform);
      updateFrame(id, { x, y, width, height });
    }
  }, []);

  const handleDragEnd = useCallback(({target}: OnDragEnd) => {
    if (target) {
      target.classList.remove('cursor-grabbing');
      target.classList.add('cursor-grab'); // Return to grab cursor
    }
  }, []);

  const handleResize = useCallback(({target, width, height, drag}: OnResize) => {
    if (target && width !== undefined && height !== undefined) {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      target.style.transform = drag.transform;
      const [x, y] = drag.translate;

      setSize({ width, height });
      setTransform(drag.transform);
      updateFrame(id, { x, y, width, height });
    }
  }, []);

  const handleRotate = useCallback(({target, transform, rotation}: OnRotate) => {
    if (target && transform) {
      target.style.transform = transform;

      setTransform(transform);
      if (rotation !== undefined) {
        setRotation(rotation);
        updateFrame(id, { rotation });
      }
    }
  }, []);

  return (
    <>
      <div
        ref={targetRef}
        className="absolute bg-blue-200 border-2 border-blue-400 rounded-lg shadow-lg cursor-grab"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: transform,
          transformOrigin: 'center center',
        }}
      >
        <div className="p-4 h-full flex flex-col justify-center items-center">
          <div className="text-sm font-semibold text-blue-800">{label}</div>
          <div className="text-xs text-blue-600 mt-1">
            {size.width} × {size.height}
          </div>
          <div className="text-xs text-blue-600">{rotation.toFixed(1)}°</div>
          <div className="text-2xl mt-2">📦</div>
        </div>
      </div>

      <Moveable
        target={targetRef}
        container={null}
        // Enable basic abilities
        draggable={true}
        resizable={true}
        rotatable={true}
        // Keep ratio during resize
        keepRatio={false}
        // Show all resize handles
        renderDirections={RENDER_DIRECTIONS}
        // Event handlers
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onResize={handleResize}
        onRotate={handleRotate}
        // Styling
        origin={true}
        edge={true}
        className="moveable-frame"
      />
    </>
  );
};
