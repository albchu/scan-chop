import React, { useRef, useState } from 'react';
import Moveable from 'react-moveable';

interface FrameDebugProps {
  id: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  initialRotation?: number;
}

export const FrameDebug: React.FC<FrameDebugProps> = ({ 
  id, 
  initialX = 100, 
  initialY = 100, 
  initialWidth = 200, 
  initialHeight = 150,
  initialRotation = 0
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(`translate(${initialX}px, ${initialY}px) rotate(${initialRotation}deg)`);
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [rotation, setRotation] = useState(initialRotation);

  return (
    <>
      <div
        ref={targetRef}
        className="absolute bg-blue-200 border-2 border-blue-400 rounded-lg shadow-lg"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: transform,
          transformOrigin: 'center center'
        }}
      >
        <div className="p-4 h-full flex flex-col justify-center items-center">
          <div className="text-sm font-semibold text-blue-800">Frame {id}</div>
          <div className="text-xs text-blue-600 mt-1">
            {size.width} × {size.height}
          </div>
          <div className="text-xs text-blue-600">
            {rotation.toFixed(1)}°
          </div>
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
        renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
        
        // Event handlers
        onDrag={({ target, transform }) => {
          if (target && transform) {
            target.style.transform = transform;
            setTransform(transform);
          }
        }}
        
        onResize={({ target, width, height, drag }) => {
          if (target && width !== undefined && height !== undefined) {
            target.style.width = `${width}px`;
            target.style.height = `${height}px`;
            target.style.transform = drag.transform;
            setSize({ width, height });
            setTransform(drag.transform);
          }
        }}
        
        onRotate={({ target, transform, rotation }) => {
          if (target && transform) {
            target.style.transform = transform;
            setTransform(transform);
            if (rotation !== undefined) {
              setRotation(rotation);
            }
          }
        }}
        
        // Styling
        origin={true}
        edge={true}
        className="frame-debug-moveable"
      />
    </>
  );
}; 