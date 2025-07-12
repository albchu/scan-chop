import React from 'react';
import { useUIContext } from '../../context/UIContext';
import { FrameCard } from './FrameCard';
// import { FrameCard as FrameCardOld } from './FrameCardOld';

export const FrameList: React.FC = () => {
  const { currentPageFrames } = useUIContext();
  const frameList = currentPageFrames;
  
  if (frameList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm">No frames yet</p>
          <p className="text-xs mt-1">Use the Add tool to create frames</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,400px))] gap-4 justify-center">
        {frameList.map(frame => (
          <FrameCard key={frame.id} frame={frame} />
        ))}
      </div>
      {/* Old FrameCard usage commented out:
      <div className="space-y-3">
        {frameList.map(frame => (
          <FrameCardOld key={frame.id} frame={frame} />
        ))}
      </div>
      */}
    </div>
  );
}; 