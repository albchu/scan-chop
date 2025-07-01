import React from 'react';
import { IconArrowUp } from '@tabler/icons-react';
import { formatSizeDisplay, formatRotationDisplay } from './frameUtils';

interface FrameInfoProps {
  label: string;
  width: number;
  height: number;
  rotation: number;
  orientation: number;
}

export const FrameInfo: React.FC<FrameInfoProps> = ({
  label,
  width,
  height,
  rotation,
  orientation,
}) => {
  return (
    <div className="p-4 h-full flex flex-col justify-center items-center relative">
      {/* Orientation Arrow */}
      <div 
        className="absolute top-2 right-2"
        style={{
          transform: `rotate(${orientation}deg)`,
          transformOrigin: 'center',
        }}
      >
        <IconArrowUp size={16} className="text-blue-600" />
      </div>
      
      <div className="text-sm font-semibold text-blue-800">{label}</div>
      <div className="text-xs text-blue-600 mt-1">
        {formatSizeDisplay(width, height)}
      </div>
      <div className="text-xs text-blue-600">{formatRotationDisplay(rotation)}</div>
      <div className="text-2xl mt-2">📦</div>
    </div>
  );
}; 