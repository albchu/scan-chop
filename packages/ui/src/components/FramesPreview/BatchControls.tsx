import React from 'react';
import { IconDownload } from '@tabler/icons-react';
import { useUIStore, useFrameCount, useSelectedCount } from '../../stores';

export const BatchControls: React.FC = () => {
  // Granular subscriptions - only re-render when these specific values change
  const frameCount = useFrameCount();
  const selectedCount = useSelectedCount();
  
  // Actions are stable references - no re-render
  const selectedFrameIds = useUIStore((state) => state.selectedFrameIds);
  const saveFrames = useUIStore((state) => state.saveFrames);
  const getCurrentPageFrames = useUIStore((state) => state.getCurrentPageFrames);
  
  // No useCallback needed - actions are stable
  const handleSaveFrames = () => {
    if (selectedCount === 0) {
      // Save all frames
      const frames = getCurrentPageFrames();
      saveFrames(frames.map(f => f.id));
    } else {
      // Save selected frames
      saveFrames(selectedFrameIds);
    }
  };
  
  return (
    <div className="px-4 py-3 space-y-3">
      {/* Batch Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSaveFrames}
          disabled={frameCount === 0}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${frameCount > 0
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <IconDownload size={16} />
          Save {selectedCount > 0 ? selectedCount : 'All'}
        </button>
      </div>
    </div>
  );
}; 