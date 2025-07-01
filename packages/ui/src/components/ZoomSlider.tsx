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

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Zoom Out"
        disabled={zoom <= 50}
      >
        <IconMinus size={16} className={zoom <= 50 ? 'text-gray-500' : 'text-white'} />
      </button>

      {/* Zoom Slider */}
      <div className="flex-1 relative">
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={zoom}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Zoom In"
        disabled={zoom >= 200}
      >
        <IconPlus size={16} className={zoom >= 200 ? 'text-gray-500' : 'text-white'} />
      </button>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Reset Zoom & Pan"
      >
        <IconRefresh size={16} className="text-white" />
      </button>

      {/* Zoom Percentage */}
      <div className="min-w-[3rem] text-sm font-mono text-gray-300 text-right">
        {zoom}%
      </div>
    </div>
  );
}; 