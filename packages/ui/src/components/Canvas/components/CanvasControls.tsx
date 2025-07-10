import React from 'react';
import { ZoomSlider } from '../../ZoomSlider';

interface CanvasControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomChange,
  onReset,
}) => {
  return (
    <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-600 group hover:opacity-100 opacity-35 transition-opacity duration-300">
      <ZoomSlider
        zoom={zoom}
        onZoomChange={onZoomChange}
        onReset={onReset}
      />
    </div>
  );
}; 