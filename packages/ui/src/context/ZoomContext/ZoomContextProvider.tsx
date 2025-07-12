import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useUIContext } from '../UIContext';
import type { ZoomContextValue, Vector2 } from './types';

const ZoomContext = createContext<ZoomContextValue | undefined>(undefined);

export const useZoomContext = () => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoomContext must be used within a ZoomContextProvider');
  }
  return context;
};

interface ZoomContextProviderProps {
  children: React.ReactNode;
}

export const ZoomContextProvider: React.FC<ZoomContextProviderProps> = ({ children }) => {
  const { currentPage } = useUIContext();
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState<Vector2>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Calculate the base scale to fit the page in the viewport
  const baseScale = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height || !currentPage || !currentPage.width || !currentPage.height) {
      return 1;
    }

    // Calculate scale factors for both dimensions
    const padding = 100; // Padding around the page in pixels
    const scaleX = (canvasSize.width - padding) / currentPage.width;
    const scaleY = (canvasSize.height - padding) / currentPage.height;
    
    // Use the smaller scale to ensure the entire page fits
    return Math.min(scaleX, scaleY, 1); // Cap at 1 to avoid upscaling small images
  }, [canvasSize, currentPage]);

  // Calculate total scale
  const totalScale = useMemo(() => {
    return baseScale * (zoom / 100);
  }, [baseScale, zoom]);

  const resetView = useCallback(() => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const value: ZoomContextValue = {
    zoom,
    baseScale,
    totalScale,
    panOffset,
    canvasSize,
    setZoom,
    setPanOffset,
    setCanvasSize,
    resetView,
  };

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}; 