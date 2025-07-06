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
  // Store actual panel widths (not affected by collapse state)
  const [actualLeftWidth, setActualLeftWidth] = useState(initialLeftWidth);
  const [actualCenterWidth, setActualCenterWidth] = useState(initialCenterWidth);
  const [actualRightWidth, setActualRightWidth] = useState(100 - initialLeftWidth - initialCenterWidth);
  
  // Collapse states
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  
  // Dragging states
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  // Refs for dragging
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(0);
  const startCenterWidthRef = useRef<number>(0);
  const startRightWidthRef = useRef<number>(0);
  const activeDividerRef = useRef<'left' | 'right' | null>(null);

  // Calculate displayed widths based on collapse state
  const leftWidth = isLeftCollapsed ? 0 : actualLeftWidth;
  const rightWidth = isRightCollapsed ? 0 : actualRightWidth;
  const centerWidth = 100 - leftWidth - rightWidth;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !activeDividerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - dragStartXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (activeDividerRef.current === 'left') {
      // When dragging left divider and right panel is collapsed,
      // we need to handle the calculation differently
      if (isRightCollapsed) {
        // Only adjust between left and center panels
        const maxLeftWidth = 100 - minPanelWidth; // All remaining space except min for center
        const newLeftWidth = Math.max(
          minPanelWidth,
          Math.min(startLeftWidthRef.current + deltaPercent, maxLeftWidth)
        );
        
        const newCenterWidth = 100 - newLeftWidth;
        
        if (newCenterWidth >= minPanelWidth) {
          setActualLeftWidth(newLeftWidth);
          setActualCenterWidth(newCenterWidth);
        }
      } else {
        // Normal three-panel dragging
        const newLeftWidth = Math.max(
          minPanelWidth,
          Math.min(
            startLeftWidthRef.current + deltaPercent,
            100 - minPanelWidth - startRightWidthRef.current // Leave space for center and right
          )
        );
        
        const newCenterWidth = 100 - newLeftWidth - startRightWidthRef.current;
        
        if (newCenterWidth >= minPanelWidth) {
          setActualLeftWidth(newLeftWidth);
          setActualCenterWidth(newCenterWidth);
        }
      }
    } else {
      // When dragging right divider and left panel is collapsed,
      // we need to handle the calculation differently
      if (isLeftCollapsed) {
        // Only adjust between center and right panels
        const maxCenterWidth = 100 - minPanelWidth; // All remaining space except min for right
        const newCenterWidth = Math.max(
          minPanelWidth,
          Math.min(startCenterWidthRef.current + deltaPercent, maxCenterWidth)
        );
        
        const newRightWidth = 100 - newCenterWidth;
        
        if (newRightWidth >= minPanelWidth) {
          setActualCenterWidth(newCenterWidth);
          setActualRightWidth(newRightWidth);
        }
      } else {
        // Normal three-panel dragging
        const newCenterWidth = Math.max(
          minPanelWidth,
          Math.min(
            startCenterWidthRef.current + deltaPercent,
            100 - startLeftWidthRef.current - minPanelWidth // Leave space for left and right
          )
        );
        
        const newRightWidth = 100 - startLeftWidthRef.current - newCenterWidth;
        
        if (newRightWidth >= minPanelWidth) {
          setActualCenterWidth(newCenterWidth);
          setActualRightWidth(newRightWidth);
        }
      }
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
    if (isLeftCollapsed) return; // Don't allow dragging left divider when left panel is collapsed
    e.preventDefault();
    setIsDraggingLeft(true);
    activeDividerRef.current = 'left';
    dragStartXRef.current = e.clientX;
    
    // When right panel is collapsed, we need to use displayed widths
    if (isRightCollapsed) {
      startLeftWidthRef.current = leftWidth;
      startCenterWidthRef.current = centerWidth;
      startRightWidthRef.current = 0;
    } else {
      startLeftWidthRef.current = actualLeftWidth;
      startCenterWidthRef.current = actualCenterWidth;
      startRightWidthRef.current = actualRightWidth;
    }
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [actualLeftWidth, actualCenterWidth, actualRightWidth, leftWidth, centerWidth, isLeftCollapsed, isRightCollapsed]);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    if (isRightCollapsed) return; // Don't allow dragging right divider when right panel is collapsed
    e.preventDefault();
    setIsDraggingRight(true);
    activeDividerRef.current = 'right';
    dragStartXRef.current = e.clientX;
    
    // When left panel is collapsed, we need to use displayed widths
    if (isLeftCollapsed) {
      startLeftWidthRef.current = 0;
      startCenterWidthRef.current = centerWidth;
      startRightWidthRef.current = rightWidth;
    } else {
      startLeftWidthRef.current = actualLeftWidth;
      startCenterWidthRef.current = actualCenterWidth;
      startRightWidthRef.current = actualRightWidth;
    }
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [actualLeftWidth, actualCenterWidth, actualRightWidth, centerWidth, rightWidth, isLeftCollapsed, isRightCollapsed]);

  const toggleLeftPanel = useCallback(() => {
    setIsLeftCollapsed(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setIsRightCollapsed(prev => !prev);
  }, []);

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