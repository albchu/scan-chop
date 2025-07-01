import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useUIContext } from '../context/UIContext';
import { ZoomContextProvider, useZoomContext } from '../context/ZoomContext';
import { Page } from './Page';
import { ZoomSlider } from './ZoomSlider';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

// Inner Canvas component that uses the zoom context
const CanvasInner: React.FC = () => {
  const { page, addFrame, selectFrame, clearSelection } = useUIContext();
  const { 
    zoom, 
    baseScale, 
    totalScale, 
    panOffset, 
    setZoom, 
    setPanOffset, 
    setCanvasSize, 
    resetView 
  } = useZoomContext();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCommandPressed, setIsCommandPressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [defaultFrameWidth, defaultFrameHeight] = useMemo(() => {
    return [
      page.width * DEFAULT_FRAME_SIZE_RATIO,
      page.height * DEFAULT_FRAME_SIZE_RATIO,
    ];
  }, [page]);

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

  // Track Command key state
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) { // metaKey for Mac Command, ctrlKey for Windows Ctrl
        setIsCommandPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isOnPage = target.closest('[data-page="true"]');
    
    // Start dragging if:
    // 1. Not clicking on the page itself (for adding frames), OR
    // 2. Command key is pressed, OR  
    // 3. Right mouse button is pressed
    const shouldStartPan = !isOnPage || isCommandPressed || e.button === 2;
    
    if (shouldStartPan) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
      e.preventDefault();
    }
  }, [panOffset, isCommandPressed]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent context menu when right-clicking for pan
    e.preventDefault();
  }, []);

  console.log('isDragging', {isDragging, zoom});
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, setPanOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't add frames if we were dragging or if Command key is pressed
    if (isDragging || isCommandPressed) return;

    // Check if we clicked on a frame
    const target = e.target as HTMLElement;
    const frameElement = target.closest('[data-frame-id]');

    if (frameElement) {
      const frameId = frameElement.getAttribute('data-frame-id');
      if(frameId){
        selectFrame(frameId);
      }
    } 
    // Clicked on the page
    else if (target.closest('[data-page="true"]')) {
      // Clicked on page background
        const pageElement = target.closest('[data-page="true"]') as HTMLElement;
        const rect = pageElement.getBoundingClientRect();
        
        // Account for both base scale and zoom when calculating click position
        const totalScale = baseScale * (zoom / 100);
        
        // Add frame at click position with default size
        // Container coordinates in html start at top left corner.
        // UX should feel better if the frame origin is spawned at the click position instead of top left corner.
        // Thats why we subtract half the frame size from the click position.
        // TODO: Control panel might need to add the frame size to the click position to trick UI into thinking the origin offset is the truth.
        const x = (e.clientX - rect.left) / totalScale - defaultFrameWidth / 2;
        const y = (e.clientY - rect.top) / totalScale - defaultFrameHeight / 2;

        addFrame({
          x,
          y,
          width: defaultFrameWidth,
          height: defaultFrameHeight,
          rotation: 0,
        });
    }
  };

  // Determine cursor based on state
  const getCursor = () => {
    if (isDragging) return 'cursor-grabbing select-none';
    if (isCommandPressed) return 'cursor-grab';
    return 'cursor-grab';
  };

  return (
    <div className="h-full bg-gray-700 flex flex-col relative">
      {/* Main canvas area with zoom and pan */}
      <div
        ref={canvasRef}
        className={`flex-1 flex items-center justify-center overflow-hidden ${getCursor()}`}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onClick={handleCanvasClick}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${totalScale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <Page />
        </div>
      </div>

      {/* Zoom slider positioned at bottom right */}
      <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-600 group hover:opacity-100 opacity-35 transition-opacity duration-300">
        <ZoomSlider
          zoom={zoom}
          onZoomChange={setZoom}
          onReset={handleReset}
        />
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded p-2 text-xs text-gray-300">
          <div>Page: {page.width} x {page.height}</div>
          <div>Base Scale: {(baseScale * 100).toFixed(1)}%</div>
          <div>Total Scale: {(totalScale * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};

// Main Canvas component that provides the zoom context
export const Canvas: React.FC = () => {
  return (
    <ZoomContextProvider>
      <CanvasInner />
    </ZoomContextProvider>
  );
};
