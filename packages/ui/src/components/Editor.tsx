import React from 'react';
import { UIContextProvider } from '../context/UIContext';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { useResizablePanels } from '../hooks/useResizablePanels';

export const Editor: React.FC = () => {
  const { leftWidth, rightWidth, isDragging, containerRef, handleMouseDown } = useResizablePanels({
    initialLeftWidth: 75, // 75% for canvas, 25% for frames preview
    minLeftWidth: 30,
    maxLeftWidth: 90,
  });

  return (
    <UIContextProvider>
      <div 
        ref={containerRef}
        className={`flex h-screen bg-gray-900 text-white ${isDragging ? 'select-none' : ''}`}
      >
        {/* Main Canvas Area */}
        <div 
          className="overflow-hidden"
          style={{ width: `${leftWidth}%` }}
        >
          <Canvas />
        </div>
        
        {/* Resizable Splitter */}
        <div
          className={`w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 ${
            isDragging ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
        
        {/* Right Panel - Frames Preview */}
        <div 
          className="bg-gray-800 border-l border-gray-700 overflow-y-auto"
          style={{ width: `${rightWidth}%` }}
        >
          <FramesPreview />
        </div>
      </div>
    </UIContextProvider>
  );
}; 