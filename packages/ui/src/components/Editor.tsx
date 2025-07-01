import React from 'react';
import { UIContextProvider } from '../context/UIContext';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';

export const Editor: React.FC = () => {
  return (
    <UIContextProvider>
      <div className="flex h-screen bg-gray-900 text-white">
        {/* Main Canvas Area */}
        <div className="flex-1 overflow-hidden">
          <Canvas />
        </div>
        
        {/* Right Panel - Frames Preview */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <FramesPreview />
        </div>
      </div>
    </UIContextProvider>
  );
}; 