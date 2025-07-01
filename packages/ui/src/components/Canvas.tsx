import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useUIContext } from '../context/UIContext';
import { Page } from './Page';
import { ZoomSlider } from './ZoomSlider';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

export const Canvas: React.FC = () => {
  const { page, addFrame, selectFrame, clearSelection } = useUIContext();
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const [defaultFrameWidth, defaultFrameHeight] = useMemo(() => {
    return [
      page.width * DEFAULT_FRAME_SIZE_RATIO,
      page.height * DEFAULT_FRAME_SIZE_RATIO,
    ];
  }, [page]);

  const handleReset = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only start dragging if we're not clicking on the page itself (for adding frames)
    const target = e.target as HTMLElement;
    const isOnPage = target.closest('[data-page="true"]');
    
    if (!isOnPage) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
      e.preventDefault();
    }
  }, [panOffset]);

  console.log('isDragging', {isDragging, zoom});
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

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
    // Don't add frames if we were dragging
    if (isDragging) return;

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
        
        // Account for zoom when calculating click position
        const zoomFactor = zoom / 100;
        
        // Add frame at click position with default size
        // Container coordinates in html start at top left corner.
        // UX should feel better if the frame origin is spawned at the click position instead of top left corner.
        // Thats why we subtract half the frame size from the click position.
        // TODO: Control panel might need to add the frame size to the click position to trick UI into thinking the origin offset is the truth.
        const x = (e.clientX - rect.left) / zoomFactor - defaultFrameWidth / 2;
        const y = (e.clientY - rect.top) / zoomFactor - defaultFrameHeight / 2;

        addFrame({
          x,
          y,
          width: defaultFrameWidth,
          height: defaultFrameHeight,
          rotation: 0,
        });
    }
  };

  return (
    <div className="h-full bg-gray-700 flex flex-col relative">
      {/* Main canvas area with zoom and pan */}
      <div
        ref={canvasRef}
        className={`flex-1 flex items-center justify-center overflow-hidden cursor-grab ${
          isDragging ? 'cursor-grabbing select-none' : ''
        }`}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <Page />
        </div>
      </div>

      {/* Zoom slider positioned at bottom */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-600 group hover:opacity-100 opacity-25 transition-opacity duration-300"
           style={{ width: '80%' }}>
        <ZoomSlider
          zoom={zoom}
          onZoomChange={setZoom}
          onReset={handleReset}
        />
      </div>
    </div>
  );
};
