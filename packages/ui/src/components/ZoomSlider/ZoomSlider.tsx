import React from 'react';
import { IconMinus, IconPlus, IconRefresh } from '@tabler/icons-react';
import styles from './ZoomSlider.module.css';

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
    const newZoom = Math.max(25, zoom - 10);
    onZoomChange(newZoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(400, zoom + 10);
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

  // Get zoom label
  const getZoomLabel = () => {
    if (zoom === 100) return 'Fit';
    return `${zoom}%`;
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Zoom Percentage */}
      <div className="text-sm font-mono text-gray-300 text-center min-w-[3rem]">
        {getZoomLabel()}
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Reset Zoom & Pan (Fit to viewport)"
      >
        <IconRefresh size={16} className="text-white" />
      </button>

      {/* Zoom In Button (Top - Positive) */}
      <button
        onClick={handleZoomIn}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Zoom In"
        disabled={zoom >= 400}
      >
        <IconPlus size={16} className={zoom >= 400 ? 'text-gray-500' : 'text-white'} />
      </button>

      {/* Zoom Slider (Vertical) */}
      <div className="relative flex items-center justify-center" style={{ width: '20px', height: '120px' }}>
        <input
          type="range"
          min="25"
          max="400"
          step="5"
          value={sliderValue}
          onChange={handleSliderChange}
          className={styles.sliderVertical}
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
        disabled={zoom <= 25}
      >
        <IconMinus size={16} className={zoom <= 25 ? 'text-gray-500' : 'text-white'} />
      </button>
    </div>
  );
}; 