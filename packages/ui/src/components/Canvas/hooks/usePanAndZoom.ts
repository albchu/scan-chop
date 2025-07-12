import React, { useState, useCallback, useEffect } from 'react';
import { PanOffset, DragState } from '../types/canvas.types';
import { useZoomContext } from '../../../context/ZoomContext';

interface UsePanAndZoomProps {
  isCommandPressed: boolean;
}

interface UsePanAndZoomReturn {
  isDragging: boolean;
  panOffset: PanOffset;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const usePanAndZoom = ({ isCommandPressed }: UsePanAndZoomProps): UsePanAndZoomReturn => {
  const { panOffset, setPanOffset } = useZoomContext();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragState>({ x: 0, y: 0 });

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
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    panOffset,
    handleMouseDown,
    handleContextMenu,
  };
}; 