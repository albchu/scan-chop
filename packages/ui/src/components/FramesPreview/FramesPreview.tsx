import React from 'react';
import { BatchControls } from './BatchControls';
import { FrameList } from './FrameList';

export const FramesPreview: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Header with Batch Controls */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Frames</h2>
        <BatchControls />
      </div>
      
      {/* Frame List */}
      <FrameList />
    </div>
  );
}; 