import React, { useCallback, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { FrameData } from '@workspace/shared';

interface FrameDebugProps {
  frame: FrameData;
}

const RENDER_DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

export const FrameDebug: React.FC<FrameDebugProps> = ({ frame }) => {
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

  const targetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    `translate(${initialX}px, ${initialY}px) rotate(${initialRotation}deg)`
  );
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [rotation, setRotation] = useState(initialRotation);

  const handleDrag = useCallback(({target, transform}: OnDrag) => {
    if (target && transform) {
      target.style.transform = transform;
      setTransform(transform);
    }
  }, []);

  const handleResize = useCallback(({target, width, height, drag}: OnResize) => {
    if (target && width !== undefined && height !== undefined) {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      target.style.transform = drag.transform;
      setSize({ width, height });
      setTransform(drag.transform);
    }
  }, []);

  const handleRotate = useCallback(({target, transform, rotation}: OnRotate) => {
    if (target && transform) {
      target.style.transform = transform;
      setTransform(transform);
      if (rotation !== undefined) {
        setRotation(rotation);
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
