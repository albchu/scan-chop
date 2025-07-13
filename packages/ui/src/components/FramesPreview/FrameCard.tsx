import React, { useState } from 'react';
import { FrameData } from '@workspace/shared';
import { FrameInfo } from '../Frame/FrameInfo';
import { useUIStore } from '../../stores';
import { useFrameTransform } from '../../hooks/useFrameTransform';
import { IconRotateClockwise, IconTrash, IconCheck } from '@tabler/icons-react';

interface FrameCardProps {
  frame: FrameData;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame }) => {
  // Direct store access with stable action references
  const selectFrame = useUIStore((state) => state.selectFrame);
  const setOrientation = useUIStore((state) => state.setOrientation);
  const removeFrame = useUIStore((state) => state.removeFrame);
  const { isSelected, selectionType } = useFrameTransform(frame.id);
  
  console.log(`[FrameCard] Rendering frame ${frame.id}, has imageData: ${!!frame.imageData}`);
  
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
  
  const handleDeleteClick = () => {
    removeFrame(frame.id);
  };
  
  const aspectRatio = frame.width / frame.height;
  
  return (
    <div
      className={`
        relative min-w-[150px] max-w-[250px] min-h-[150px] md:min-h-[150px] bg-gray-800 rounded-lg shadow transition-all duration-200 overflow-hidden
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
      {/* Frame image preview */}
      {frame.imageData && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${frame.imageData})`,
            transform: `rotate(${frame.orientation}deg)`,
            transformOrigin: 'center center'
          }}
        />
      )}
      
      {/* Gradient overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      
      {/* Top right corner - Delete button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={handleDeleteClick}
          className="p-2 bg-black/50 hover:bg-red-600/50 rounded-lg transition-colors opacity-70 hover:opacity-100"
          title="Delete frame"
        >
          <IconTrash size={20} className="text-red-400 hover:text-red-300" />
        </button>
      </div>
      
      {/* Bottom row - Controls */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        {/* Left side - Checkbox and Frame info */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600 mt-0.5"
          />
          <div 
            className="flex flex-col text-sm text-gray-300 cursor-pointer hover:text-white transition-colors"
            onClick={handleCheckboxChange}
          >
            <div className="font-medium text-white drop-shadow-md">{frame.label}</div>
            <div className="text-xs text-gray-300 drop-shadow-md">
              {frame.imageScaleFactor 
                ? `${Math.round(frame.width * frame.imageScaleFactor)} × ${Math.round(frame.height * frame.imageScaleFactor)}`
                : `${Math.round(frame.width)} × ${Math.round(frame.height)}`
              }
            </div>
          </div>
        </div>
        
        {/* Right side - Rotate button */}
        <button
          onClick={handleRotateClick}
          className="p-2 bg-black/50 hover:bg-gray-600/50 rounded-lg transition-colors"
          title={`Rotate (current: ${frame.orientation}°)`}
        >
          <IconRotateClockwise size={20} className="text-white drop-shadow-md" />
        </button>
      </div>
    </div>
  );
}; 