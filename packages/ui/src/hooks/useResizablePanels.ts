import { useState, useCallback, useRef } from 'react';

interface UseResizablePanelsProps {
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export const useResizablePanels = ({
  initialLeftWidth = 70, // percentage
  minLeftWidth = 20,
  maxLeftWidth = 80,
}: UseResizablePanelsProps = {}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Clamp the width between min and max values
      const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minLeftWidth, maxLeftWidth]);

  return {
    leftWidth,
    rightWidth: 100 - leftWidth,
    isDragging,
    containerRef,
    handleMouseDown,
  };
}; 