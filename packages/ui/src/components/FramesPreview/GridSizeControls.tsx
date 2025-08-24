import React from 'react';

interface GridSizeControlsProps {
  value: number;
  onChange: (width: number) => void;
}

const GRID_SIZE_PRESETS = [120, 160, 200, 240, 300, 360, 420];

export const GridSizeControls: React.FC<GridSizeControlsProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-400 mr-2 font-medium">Size:</span>
      <div className="flex gap-1 p-1 bg-gray-700 rounded-md">
        {GRID_SIZE_PRESETS.map((size) => (
          <button
            key={size}
            onClick={() => onChange(size)}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-all duration-200
              ${value === size
                ? 'bg-gray-900 text-blue-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
              }
            `}
            title={`Set grid size to ${size}px`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
};
