import React, { useRef, useCallback, useEffect } from 'react';
import { useUIContext } from '../../context/UIContext';
import { useZoomContext } from '../../context/ZoomContext';
import { useKeyboardModifiers } from './hooks/useKeyboardModifiers';
import { usePanAndZoom } from './hooks/usePanAndZoom';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { CanvasViewport } from './components/CanvasViewport';
import { CanvasControls } from './components/CanvasControls';
import { CanvasDebugInfo } from './components/CanvasDebugInfo';
import { getCursorStyle } from './utils/canvasUtils';

export const CanvasInner: React.FC = () => {
  const { page } = useUIContext();
  const { 
    zoom, 
    baseScale, 
    totalScale, 
    setZoom, 
    setCanvasSize, 
    resetView 
  } = useZoomContext();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { isCommandPressed } = useKeyboardModifiers();
  
  const { isDragging, panOffset, handleMouseDown, handleContextMenu } = usePanAndZoom({ 
    isCommandPressed 
  });
  
  const { handleCanvasClick } = useCanvasInteraction({ 
    isDragging, 
    isCommandPressed 
  });

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [setCanvasSize]);

  const handleReset = useCallback(() => {
    resetView();
  }, [resetView]);

  const cursorStyle = getCursorStyle(isDragging, isCommandPressed);

  return (
    <div className="h-full bg-gray-700 flex flex-col relative">
      {/* Main canvas area with zoom and pan */}
      <div
        ref={canvasRef}
        className={`flex-1 flex items-center justify-center overflow-hidden ${cursorStyle}`}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onClick={handleCanvasClick}
      >
        <CanvasViewport 
          panOffset={panOffset}
          totalScale={totalScale}
          isDragging={isDragging}
        />
      </div>

      {/* Controls and debug info */}
      <CanvasControls 
        zoom={zoom}
        onZoomChange={setZoom}
        onReset={handleReset}
      />
      
      <CanvasDebugInfo 
        pageWidth={page.width}
        pageHeight={page.height}
        baseScale={baseScale}
        totalScale={totalScale}
      />
    </div>
  );
}; 