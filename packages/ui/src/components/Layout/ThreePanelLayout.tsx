import React, { ReactNode } from 'react';
import { DividerButton } from '../DividerButton';
import { useResizableThreePanels } from '../../hooks/useResizableThreePanels';

interface ThreePanelLayoutProps {
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode; // Center panel content
  initialLeftWidth?: number;
  initialCenterWidth?: number;
  minPanelWidth?: number;
}

export const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  children,
  initialLeftWidth = 20,
  initialCenterWidth = 60,
  minPanelWidth = 10,
}) => {
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
    initialLeftWidth,
    initialCenterWidth,
    minPanelWidth,
  });

  const isDragging = isDraggingLeft || isDraggingRight;

  return (
    <div 
      ref={containerRef}
      className={`flex h-full bg-gray-900 text-white overflow-hidden ${isDragging ? 'select-none' : ''}`}
    >
      {/* Left Panel */}
      {leftPanel && (
        <>
          <div 
            className={`bg-gray-950 overflow-hidden flex-shrink-0 ${
              isDragging ? '' : 'transition-all duration-300 ease-in-out'
            }`}
            style={{ 
              flexBasis: `${leftWidth}%`,
              // Remove negative margin - width is already 0 when collapsed
            }}
          >
            {leftPanel}
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
        </>
      )}
      
      {/* Center Panel */}
      <div 
        className={`overflow-hidden flex-shrink-0 ${
          isDragging ? '' : 'transition-all duration-300 ease-in-out'
        }`}
        style={{ flexBasis: `${centerWidth}%` }}
      >
        {children}
      </div>
      
      {/* Right Panel */}
      {rightPanel && (
        <>
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
          
          <div 
            className={`bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0 ${
              isDragging ? '' : 'transition-all duration-300 ease-in-out'
            }`}
            style={{ 
              flexBasis: `${rightWidth}%`,
              // Remove negative margin - width is already 0 when collapsed
            }}
          >
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}; 