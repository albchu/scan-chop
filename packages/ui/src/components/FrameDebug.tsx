import React, { useCallback, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { FrameData } from '@workspace/shared';

interface FrameDebugProps {
  frame: FrameData;
  updateFrame: (id: string, updates: Partial<FrameData>) => void;
}

const RENDER_DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

// TODO: Might need to debounce updateFrame later if rendering gets chuggy with a lot of frames. Lez find out.
export const FrameDebug: React.FC<FrameDebugProps> = ({ frame, updateFrame }) => {
  // The frame position, size, and rotation can be initialized from frame data but frame data
  // cannot actively drive the moveable component because the moveable component is driving
  // and needs instant UI feedback to drive the experience.
  const {
    id,
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
    rotation: initialRotation,
  } = frame;

  // TODO: Figure out parity with features I want from frame.
  // I dont think we need the ref registry anymore.
  // I want the ability to delete frames from inside the frame. This will allow me to get rid of select vs add modes.
  // I think I can remove the history stack stuff.
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

  const handleDrag = useCallback(({target, transform, translate, width, height}: OnDrag) => {
    if (target && transform) {
      target.style.transform = transform;
      const [x, y] = translate;
      setTransform(transform);
      updateFrame(id, { x, y, width, height });
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
        className="absolute bg-blue-200 border-2 border-blue-400 rounded-lg shadow-lg"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: transform,
          transformOrigin: 'center center',
        }}
      >
        <div className="p-4 h-full flex flex-col justify-center items-center">
          <div className="text-sm font-semibold text-blue-800">Frame {id}</div>
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
        onDrag={handleDrag}
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
