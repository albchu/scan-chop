import React, { useState, useRef, useCallback, useEffect } from 'react';

interface UseResizableThreePanelsProps {
  initialLeftWidth?: number;   // Percentage for left panel
  initialCenterWidth?: number; // Percentage for center panel  
  minPanelWidth?: number;      // Minimum percentage for any panel
}

interface UseResizableThreePanelsReturn {
  leftWidth: number;
  centerWidth: number;
  rightWidth: number;
  isDraggingLeft: boolean;
  isDraggingRight: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  handleLeftMouseDown: (e: React.MouseEvent) => void;
  handleRightMouseDown: (e: React.MouseEvent) => void;
}

export const useResizableThreePanels = ({
  initialLeftWidth = 20,
  initialCenterWidth = 60,
  minPanelWidth = 10,
}: UseResizableThreePanelsProps = {}): UseResizableThreePanelsReturn => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [centerWidth, setCenterWidth] = useState(initialCenterWidth);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(0);
  const startCenterWidthRef = useRef<number>(0);
  const activeDividerRef = useRef<'left' | 'right' | null>(null);

  // Calculate right width based on left and center
  const rightWidth = 100 - leftWidth - centerWidth;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !activeDividerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - dragStartXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (activeDividerRef.current === 'left') {
      // Dragging left divider
      const newLeftWidth = Math.max(
        minPanelWidth,
        Math.min(
          startLeftWidthRef.current + deltaPercent,
          100 - centerWidth - minPanelWidth
        )
      );
      setLeftWidth(newLeftWidth);
    } else {
      // Dragging right divider
      const newCenterWidth = Math.max(
        minPanelWidth,
        Math.min(
          startCenterWidthRef.current + deltaPercent,
          100 - leftWidth - minPanelWidth
        )
      );
      setCenterWidth(newCenterWidth);
    }
  }, [leftWidth, centerWidth, minPanelWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
    activeDividerRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
    activeDividerRef.current = 'left';
    dragStartXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    activeDividerRef.current = 'right';
    dragStartXRef.current = e.clientX;
    startCenterWidthRef.current = centerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [centerWidth]);

  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

  return {
    leftWidth,
    centerWidth,
    rightWidth,
    isDraggingLeft,
    isDraggingRight,
    containerRef,
    handleLeftMouseDown,
    handleRightMouseDown,
  };
}; 