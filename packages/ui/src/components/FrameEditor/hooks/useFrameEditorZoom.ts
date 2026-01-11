import React, { useState, useCallback, useEffect, RefObject } from 'react';

interface Vector2 {
  x: number;
  y: number;
}

interface UseFrameEditorZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  imageWidth: number;
  imageHeight: number;
  frameId: string | null;
}

interface UseFrameEditorZoomReturn {
  zoom: number;
  panOffset: Vector2;
  baseScale: number;
  totalScale: number;
  isDragging: boolean;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export const useFrameEditorZoom = ({
  containerRef,
  imageWidth,
  imageHeight,
  frameId,
}: UseFrameEditorZoomProps): UseFrameEditorZoomReturn => {
  const [zoom, setZoomState] = useState(100);
  const [panOffset, setPanOffset] = useState<Vector2>({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2>({ x: 0, y: 0 });

  const totalScale = baseScale * (zoom / 100);

  // Calculate base scale to fit image in container
  const updateBaseScale = useCallback(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) {
      setBaseScale(1);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 40;
    const scaleX = (rect.width - padding) / imageWidth;
    const scaleY = (rect.height - padding) / imageHeight;
    setBaseScale(Math.min(scaleX, scaleY, 1));
  }, [containerRef, imageWidth, imageHeight]);

  // Update base scale on mount and resize
  useEffect(() => {
    updateBaseScale();
    window.addEventListener('resize', updateBaseScale);
    return () => window.removeEventListener('resize', updateBaseScale);
  }, [updateBaseScale]);

  // Reset zoom/pan when frame changes
  useEffect(() => {
    setZoomState(100);
    setPanOffset({ x: 0, y: 0 });
    updateBaseScale();
  }, [frameId, updateBaseScale]);

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(newZoom);
  }, []);

  const resetView = useCallback(() => {
    setZoomState(100);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start dragging
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    });
    e.preventDefault();
  }, [panOffset]);

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

  // Global mouse event listeners for dragging
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
    zoom,
    panOffset,
    baseScale,
    totalScale,
    isDragging,
    setZoom,
    resetView,
    handleMouseDown,
  };
};
