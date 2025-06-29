import React, { useRef, useEffect } from 'react';
import Moveable from 'react-moveable';
import { useUIContext } from '../context/UIContext';
import { useFrameTransform } from '../hooks/useFrameTransform';
import { useFrameRefRegistry } from '../context/FrameRefRegistryContext';
import { MIN_FRAME_SIZE } from '@workspace/shared';

interface FrameProps {
  id: string;
  isActive: boolean; // Only true when single-selected
}

export const Frame: React.FC<FrameProps> = ({ id, isActive }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const { page, updateFrame } = useUIContext();
  const { frame, isSelected, selectionType } = useFrameTransform(id);
  const frameRefRegistry = useFrameRefRegistry();

  // Register moveable ref
  useEffect(() => {
    if (moveableRef.current) {
      frameRefRegistry.current[id] = moveableRef.current;
    }
    return () => {
      delete frameRefRegistry.current[id];
    };
  }, [id, frameRefRegistry]);

  if (!frame) return null;

  const handleDrag = (e: any) => {
    const { left, top } = e;
    
    // Only update if values are defined
    if (left !== undefined && top !== undefined) {
      // Validate bounds (0 to page dimensions)
      const newX = Math.max(0, Math.min(left, page.width));
      const newY = Math.max(0, Math.min(top, page.height));
      
      updateFrame(id, { x: newX, y: newY });
    }
  };

  const handleResize = (e: any) => {
    const { width, height, drag } = e;
    const { left, top } = drag;
    
    // Only update if values are defined
    if (width !== undefined && height !== undefined && left !== undefined && top !== undefined) {
      // Validate position stays in bounds
      const newX = Math.max(0, Math.min(left, page.width));
      const newY = Math.max(0, Math.min(top, page.height));
      
      updateFrame(id, {
        x: newX,
        y: newY,
        width: Math.max(MIN_FRAME_SIZE, width),
        height: Math.max(MIN_FRAME_SIZE, height)
      });
    }
  };

  const handleRotate = (e: any) => {
    const { rotation } = e;
    // Only update if rotation is defined to prevent undefined values
    if (rotation !== undefined) {
      updateFrame(id, { rotation });
    }
  };

  return (
    <>
      <div
        ref={frameRef}
        data-frame-id={id}
        className={`
          absolute border-2 bg-white/10 backdrop-blur-sm transition-all duration-200
          ${isSelected 
            ? selectionType === 'single' 
              ? 'ring-2 ring-blue-500 border-blue-500' 
              : 'ring-2 ring-indigo-500 ring-dashed border-indigo-500'
            : 'border-gray-400 hover:border-gray-300'
          }
        `}
        style={{
          left: `${frame.x}px`,
          top: `${frame.y}px`,
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          transform: `rotate(${frame.rotation}deg)`,
          transformOrigin: 'center center'
        }}
      >
        {/* Frame content */}
        <div className="relative w-full h-full p-2">
          {/* Frame label */}
          <div className="absolute top-1 left-2 text-xs font-medium text-gray-200 bg-gray-900/70 px-2 py-0.5 rounded">
            {frame.label}
          </div>
          
          {/* Orientation Arrow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-white/50"
            style={{ transform: `translate(-50%, -50%) rotate(${frame.orientation}deg)` }}
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
            right: page.width,
            bottom: page.height
          }}
          
          // No snapping for free rotation
          snappable={false}
          
          // Event handlers
          onDrag={handleDrag}
          onDragEnd={handleDrag}
          onResize={handleResize}
          onResizeEnd={handleResize}
          onRotate={handleRotate}
          onRotateEnd={handleRotate}
          
          // Control box styling
          edge={true}
          origin={true}
          
          // Custom class for styling
          className="moveable-frame"
        />
      )}
    </>
  );
}; 