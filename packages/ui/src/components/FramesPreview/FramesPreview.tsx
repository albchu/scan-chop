import React from 'react';
import { useUIStore } from '../../stores';
import { FramesGrid } from './FramesGrid';
import { GridSizeControls } from './GridSizeControls';

export const FramesPreview: React.FC = () => {
  const gridColumnWidth = useUIStore((state) => state.gridColumnWidth);
  const setGridColumnWidth = useUIStore((state) => state.setGridColumnWidth);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header with Grid Controls */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Frames</h2>
        <GridSizeControls 
          value={gridColumnWidth}
          onChange={setGridColumnWidth}
        />
      </div>
      
      {/* Frames Grid */}
      <FramesGrid />
    </div>
  );
}; 