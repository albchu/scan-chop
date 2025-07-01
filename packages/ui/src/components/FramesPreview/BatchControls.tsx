import React from 'react';
import { IconDownload } from '@tabler/icons-react';
import { useUIContext } from '../../context/UIContext';

export const BatchControls: React.FC = () => {
  const { frames, selectedFrameIds, saveFrames, removeFramesBatch } = useUIContext();
  const frameCount = Object.keys(frames).length;
  const selectedCount = selectedFrameIds.length;
  
  const handleSaveFrames = () => {
    if (selectedCount === 0) {
      // Save all frames
      saveFrames(Object.keys(frames));
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