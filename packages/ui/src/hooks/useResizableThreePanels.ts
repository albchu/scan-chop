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
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  isDraggingLeft: boolean;
  isDraggingRight: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  handleLeftMouseDown: (e: React.MouseEvent) => void;
  handleRightMouseDown: (e: React.MouseEvent) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useResizableThreePanels = ({
  initialLeftWidth = 20,
  initialCenterWidth = 60,
  minPanelWidth = 10,
}: UseResizableThreePanelsProps = {}): UseResizableThreePanelsReturn => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [centerWidth, setCenterWidth] = useState(initialCenterWidth);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  // Store the widths before collapse to restore them
  const previousLeftWidthRef = useRef(initialLeftWidth);
  const previousCenterWidthRef = useRef(initialCenterWidth);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(0);
  const startCenterWidthRef = useRef<number>(0);
  const activeDividerRef = useRef<'left' | 'right' | null>(null);

  // Calculate right width based on left and center
  const rightWidth = 100 - leftWidth - centerWidth;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !activeDividerRef.current) return;
    if (isLeftCollapsed || isRightCollapsed) return; // Don't allow dragging when panels are collapsed

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
          100 - startCenterWidthRef.current - minPanelWidth
        )
      );
      // Ensure total doesn't exceed 100%
      const maxLeftWidth = 100 - startCenterWidthRef.current - (100 - startLeftWidthRef.current - startCenterWidthRef.current);
      setLeftWidth(Math.min(newLeftWidth, maxLeftWidth));
    } else {
      // Dragging right divider  
      const rightPanelWidth = 100 - startLeftWidthRef.current - startCenterWidthRef.current;
      const newCenterWidth = Math.max(
        minPanelWidth,
        Math.min(
          startCenterWidthRef.current + deltaPercent,
          100 - startLeftWidthRef.current - minPanelWidth
        )
      );
      // Ensure total doesn't exceed 100%
      const maxCenterWidth = 100 - startLeftWidthRef.current - minPanelWidth;
      setCenterWidth(Math.min(newCenterWidth, maxCenterWidth));
    }
  }, [minPanelWidth, isLeftCollapsed, isRightCollapsed]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
    activeDividerRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLeftCollapsed) return; // Don't allow dragging when collapsed
    e.preventDefault();
    setIsDraggingLeft(true);
    activeDividerRef.current = 'left';
    dragStartXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidth;
    startCenterWidthRef.current = centerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth, centerWidth, isLeftCollapsed]);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    if (isRightCollapsed) return; // Don't allow dragging when collapsed
    e.preventDefault();
    setIsDraggingRight(true);
    activeDividerRef.current = 'right';
    dragStartXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidth;
    startCenterWidthRef.current = centerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth, centerWidth, isRightCollapsed]);

  const toggleLeftPanel = useCallback(() => {
    if (isLeftCollapsed) {
      // Expand
      setLeftWidth(previousLeftWidthRef.current);
      setCenterWidth(previousCenterWidthRef.current);
      setIsLeftCollapsed(false);
    } else {
      // Collapse
      previousLeftWidthRef.current = leftWidth;
      previousCenterWidthRef.current = centerWidth;
      setLeftWidth(0);
      setCenterWidth(centerWidth + leftWidth);
      setIsLeftCollapsed(true);
    }
  }, [isLeftCollapsed, leftWidth, centerWidth]);

  const toggleRightPanel = useCallback(() => {
    if (isRightCollapsed) {
      // Expand
      setCenterWidth(previousCenterWidthRef.current);
      setIsRightCollapsed(false);
    } else {
      // Collapse
      previousCenterWidthRef.current = centerWidth;
      const currentRightWidth = 100 - leftWidth - centerWidth;
      setCenterWidth(centerWidth + currentRightWidth);
      setIsRightCollapsed(true);
    }
  }, [isRightCollapsed, leftWidth, centerWidth]);

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
    leftWidth: isLeftCollapsed ? 0 : leftWidth,
    centerWidth,
    rightWidth: isRightCollapsed ? 0 : rightWidth,
    isLeftCollapsed,
    isRightCollapsed,
    isDraggingLeft,
    isDraggingRight,
    containerRef,
    handleLeftMouseDown,
    handleRightMouseDown,
    toggleLeftPanel,
    toggleRightPanel,
  };
}; 