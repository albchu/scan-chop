import React from 'react';
import { ZoomContextProvider } from '../../context/ZoomContext';
import { CanvasInner } from './CanvasInner';

export const Canvas: React.FC = () => {
  return (
    <ZoomContextProvider>
      <CanvasInner />
    </ZoomContextProvider>
  );
}; 