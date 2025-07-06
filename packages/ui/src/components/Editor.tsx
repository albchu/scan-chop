import React from 'react';
import { UIContextProvider } from '../context/UIContext';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { FileExplorer } from './FileExplorer';
import { useResizableThreePanels } from '../hooks/useResizableThreePanels';

export const Editor: React.FC = () => {
  const { 
    leftWidth, 
    centerWidth, 
    rightWidth, 
    isDraggingLeft, 
    isDraggingRight, 
    containerRef, 
    handleLeftMouseDown, 
    handleRightMouseDown 
  } = useResizableThreePanels({
    initialLeftWidth: 20,  // 20% for file explorer
    initialCenterWidth: 60, // 60% for canvas
    minPanelWidth: 10,
  });

  const isDragging = isDraggingLeft || isDraggingRight;

  return (
    <UIContextProvider>
      <div 
        ref={containerRef}
        className={`flex h-screen bg-gray-900 text-white ${isDragging ? 'select-none' : ''}`}
      >
        {/* Left Panel - File Explorer */}
        <div 
          className="bg-gray-900 border-r border-gray-700 overflow-hidden"
          style={{ width: `${leftWidth}%` }}
        >
          <FileExplorer onFileSelect={(path) => console.log('File selected:', path)} />
        </div>
        
        {/* Left Resizable Splitter */}
        <div
          className={`w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 ${
            isDraggingLeft ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleLeftMouseDown}
        />
        
        {/* Center Panel - Canvas */}
        <div 
          className="overflow-hidden"
          style={{ width: `${centerWidth}%` }}
        >
          <Canvas />
        </div>
        
        {/* Right Resizable Splitter */}
        <div
          className={`w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 ${
            isDraggingRight ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleRightMouseDown}
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