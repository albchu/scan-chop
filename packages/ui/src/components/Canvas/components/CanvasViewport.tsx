import React from 'react';
import { Page } from '../../Page';
import { getTransformStyle } from '../utils/canvasUtils';

interface CanvasViewportProps {
  panOffset: { x: number; y: number };
  totalScale: number;
  isDragging: boolean;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  panOffset,
  totalScale,
  isDragging,
}) => {
  return (
    <div style={getTransformStyle(panOffset, totalScale, isDragging)}>
      <Page />
    </div>
  );
}; 