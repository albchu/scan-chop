import React from 'react';

interface GridSizeControlsProps {
  value: number;
  onChange: (width: number) => void;
}

export const GridSizeControls: React.FC<GridSizeControlsProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium">Size</span>
      <input
        type="range"
        min={120}
        max={420}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
};
