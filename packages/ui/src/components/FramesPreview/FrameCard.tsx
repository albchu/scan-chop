import React from 'react';
import { FrameData } from '@workspace/shared';
import { FrameControlPanel } from './FrameControlPanel';
import { useFrameTransform } from '../../hooks/useFrameTransform';

interface FrameCardProps {
  frame: FrameData;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame }) => {
  const { isSelected, selectionType } = useFrameTransform(frame.id);
  
  return (
    <div
      className={`
        bg-gray-800 rounded-lg p-4 shadow transition-all duration-200
        ${isSelected 
          ? selectionType === 'single'
            ? 'border-2 border-blue-500 ring-1 ring-blue-500/50'
            : 'border-2 border-indigo-500 ring-1 ring-indigo-500/50'
          : 'border-2 border-transparent hover:bg-gray-750'
        }
      `}
    >
      <FrameControlPanel frame={frame} />
    </div>
  );
}; 