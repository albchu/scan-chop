import React from 'react';
import { UIContextProvider } from '../context/UIContext';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { FileExplorer } from './FileExplorer';
import { DividerButton } from './DividerButton';
import { useResizableThreePanels } from '../hooks/useResizableThreePanels';

export const Editor: React.FC = () => {
  const { 
    leftWidth, 
    centerWidth, 
    rightWidth,
    isLeftCollapsed,
    isRightCollapsed,
    isDraggingLeft, 
    isDraggingRight, 
    containerRef, 
    handleLeftMouseDown, 
    handleRightMouseDown,
    toggleLeftPanel,
    toggleRightPanel
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
        className={`flex h-screen bg-gray-900 text-white overflow-hidden ${isDragging ? 'select-none' : ''}`}
      >
        {/* Left Panel - File Explorer */}
        <div 
          className={`bg-gray-900 border-r border-gray-700 overflow-hidden flex-shrink-0 ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ 
            flexBasis: `${leftWidth}%`,
            marginLeft: isLeftCollapsed ? `-${leftWidth}%` : '0'
          }}
        >
          <FileExplorer onFileSelect={(path) => console.log('File selected:', path)} />
        </div>
        
        {/* Left Resizable Splitter */}
        <div
          className={`relative w-1 bg-gray-600 hover:bg-blue-500 transition-colors duration-150 flex-shrink-0 ${
            isDraggingLeft ? 'bg-blue-500' : ''
          } ${isLeftCollapsed ? '' : 'cursor-col-resize'}`}
          onMouseDown={(e) => {
            // Only start drag if not clicking on button
            if ((e.target as HTMLElement).closest('button')) return;
            handleLeftMouseDown(e);
          }}
        >
          <DividerButton
            side="left"
            isCollapsed={isLeftCollapsed}
            onClick={toggleLeftPanel}
            isDragging={isDraggingLeft}
          />
        </div>
        
        {/* Center Panel - Canvas */}
        <div 
          className={`overflow-hidden flex-shrink-0 ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ flexBasis: `${centerWidth}%` }}
        >
          <Canvas />
        </div>
        
        {/* Right Resizable Splitter */}
        <div
          className={`relative w-1 bg-gray-600 hover:bg-blue-500 transition-colors duration-150 flex-shrink-0 ${
            isDraggingRight ? 'bg-blue-500' : ''
          } ${isRightCollapsed ? '' : 'cursor-col-resize'}`}
          onMouseDown={(e) => {
            // Only start drag if not clicking on button
            if ((e.target as HTMLElement).closest('button')) return;
            handleRightMouseDown(e);
          }}
        >
          <DividerButton
            side="right"
            isCollapsed={isRightCollapsed}
            onClick={toggleRightPanel}
            isDragging={isDraggingRight}
          />
        </div>
        
        {/* Right Panel - Frames Preview */}
        <div 
          className={`bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0 ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ 
            flexBasis: `${rightWidth}%`,
            marginRight: isRightCollapsed ? `-${rightWidth}%` : '0'
          }}
        >
          <FramesPreview />
        </div>
      </div>
    </UIContextProvider>
  );
}; 