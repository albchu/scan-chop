import React from 'react';
import { BatchControls } from './BatchControls';
import { FrameList } from './FrameList';

export const FramesPreview: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200">Frames</h2>
      </div>
      
      {/* Batch Controls */}
      <BatchControls />
      
      {/* Frame List */}
      <FrameList />
    </div>
  );
}; 