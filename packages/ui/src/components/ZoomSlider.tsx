import React from 'react';
import { IconMinus, IconPlus, IconRefresh } from '@tabler/icons-react';

interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset?: () => void;
  className?: string;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({
  zoom,
  onZoomChange,
  onReset,
  className = '',
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseInt(e.target.value));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(50, zoom - 10);
    onZoomChange(newZoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(200, zoom + 10);
    onZoomChange(newZoom);
  };

  const handleReset = () => {
    onZoomChange(100);
    if (onReset) {
      onReset();
    }
  };

  // Use zoom value directly for the slider
  const sliderValue = zoom;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Zoom Percentage */}
      <div className="text-sm font-mono text-gray-300 text-center">
        {zoom}%
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Reset Zoom & Pan"
      >
        <IconRefresh size={16} className="text-white" />
      </button>

      {/* Zoom In Button (Top - Positive) */}
      <button
        onClick={handleZoomIn}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Zoom In"
        disabled={zoom >= 200}
      >
        <IconPlus size={16} className={zoom >= 200 ? 'text-gray-500' : 'text-white'} />
      </button>

      {/* Zoom Slider (Vertical) */}
      <div className="relative flex items-center justify-center" style={{ width: '20px', height: '120px' }}>
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={sliderValue}
          onChange={handleSliderChange}
          className="slider-vertical"
          style={{
            width: '120px',
            height: '20px',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* Zoom Out Button (Bottom - Negative) */}
      <button
        onClick={handleZoomOut}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Zoom Out"
        disabled={zoom <= 50}
      >
        <IconMinus size={16} className={zoom <= 50 ? 'text-gray-500' : 'text-white'} />
      </button>
    </div>
  );
}; 