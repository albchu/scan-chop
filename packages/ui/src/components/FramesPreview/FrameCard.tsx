import React from 'react';
import { FrameData } from '@workspace/shared';
import { useFrameTransform } from '../../hooks/useFrameTransform';
import { useUIContext } from '../../context/UIContext';

interface FrameCardProps {
  frame: FrameData;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame }) => {
  const { isSelected, selectionType } = useFrameTransform(frame.id);
  const { selectFrame, setOrientation } = useUIContext();
  
  const handleCheckboxChange = () => {
    selectFrame(frame.id);
  };
  
  const handleRotateClick = () => {
    // Cycle through orientation values: 0 -> 90 -> 180 -> 270 -> 0
    const nextOrientation = (() => {
      switch (frame.orientation) {
        case 0: return 90;
        case 90: return 180;
        case 180: return 270;
        case 270: return 0;
        default: return 0;
      }
    })() as 0 | 90 | 180 | 270;
    
    setOrientation(frame.id, nextOrientation);
  };
  
  const aspectRatio = frame.width / frame.height;
  
  return (
    <div
      className={`
        relative min-w-[150px] max-w-[400px] min-h-[150px] md:min-h-[150px] bg-gray-800 rounded-lg shadow transition-all duration-200
        ${isSelected 
          ? selectionType === 'single'
            ? 'border-2 border-blue-500 ring-1 ring-blue-500/50'
            : 'border-2 border-indigo-500 ring-1 ring-indigo-500/50'
          : 'border-2 border-transparent hover:bg-gray-750'
        }
      `}
      style={{
        aspectRatio: aspectRatio.toString()
      }}
    >
      {/* Top right corner - Checkbox and Rotate button */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
        />
        <button
          onClick={handleRotateClick}
          className="p-1 bg-transparent hover:bg-gray-600 rounded transition-colors"
          title={`Rotate (current: ${frame.orientation}°)`}
        >
          <svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>
      
      {/* Bottom left corner - Frame info */}
      <div className="absolute bottom-2 left-2 flex flex-col text-sm text-gray-300">
        <div className="font-medium text-white">{frame.label}</div>
        <div className="text-xs text-gray-400">
          {Math.round(frame.width)} × {Math.round(frame.height)}
        </div>
      </div>
    </div>
  );
}; 