import React from 'react';
import { useUIStore } from '../../stores';
import { FrameCard } from './FrameCard';

export const FramesGrid: React.FC = () => {
  // Get frames exactly like current FrameList
  const frameList = useUIStore(state => Object.values(state.framesByPage).flat());
  const currentFrameId = useUIStore(state => state.currentFrameId);
  const gridColumnWidth = useUIStore(state => state.gridColumnWidth);

  if (frameList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm">No frames yet</p>
          <p className="text-xs mt-1">Click on the canvas to create frames</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div
        className="masonry-columns"
        style={{
          columnCount: 'auto',
          columnWidth: `${gridColumnWidth}px`,
          columnGap: '16px',
        }}
      >
        {frameList.map((frame) => (
          <FrameCard 
            key={frame.id} 
            frame={frame} 
            isCurrent={frame.id === currentFrameId}
          />
        ))}
      </div>
    </div>
  );
};
