import React from 'react';
import { FrameData } from '@workspace/shared';
import { useUIStore } from '../../stores';
import { EditableLabel } from '../common';

interface FrameCardProps {
  frame: FrameData;
  isCurrent?: boolean;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame, isCurrent = false }) => {
  const updateFrame = useUIStore((state) => state.updateFrame);
  const setCurrentFrameId = useUIStore((state) => state.setCurrentFrameId);
  const setActiveView = useUIStore((state) => state.setActiveView);
  
  const handleClick = () => {
    setCurrentFrameId(frame.id);
    setActiveView('frame-editor');
  };
  
  const isRotated = frame.orientation === 90 || frame.orientation === 270;
  const aspectRatio = isRotated 
    ? frame.height / frame.width 
    : frame.width / frame.height;
  
  return (
    <div
      onClick={handleClick}
      className={`
        frame-card-animated rounded bg-gray-800 overflow-hidden cursor-pointer
        hover:shadow-xl transition-all duration-300
        ${isCurrent ? 'ring-4 ring-blue-500 shadow-2xl shadow-blue-500/20' : ''}
      `}
    >
      <div
        className="relative overflow-hidden bg-gray-700"
        style={{ aspectRatio: aspectRatio.toString() }}
      >
        {frame.imageData ? (
          <img
            src={frame.imageData}
            alt={frame.label}
            className="absolute w-full h-auto"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${frame.orientation}deg)${isRotated ? ' scale(1.5)' : ''}`,
            }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 animate-pulse" />
        )}
      </div>

      <footer className="flex items-center justify-between px-2 py-1 text-sm text-gray-300">
        <EditableLabel
          value={frame.label}
          onChange={(label) => updateFrame(frame.id, { label })}
        />
        <span className="text-xs text-gray-500">
          {frame.imageScaleFactor 
            ? `${Math.round(frame.width * frame.imageScaleFactor)} × ${Math.round(frame.height * frame.imageScaleFactor)}`
            : `${Math.round(frame.width)} × ${Math.round(frame.height)}`
          }
        </span>
      </footer>
    </div>
  );
};
