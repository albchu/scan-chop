import React from 'react';
import { IconDownload, IconTrash } from '@tabler/icons-react';
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
  
  const handleRemoveFrames = () => {
    if (selectedCount > 0) {
      removeFramesBatch(selectedFrameIds);
    }
  };
  
  return (
    <div className="px-4 py-3 space-y-3">
      {/* Selection Info */}
      {selectedCount > 0 && (
        <div className="text-sm text-gray-400">
          {selectedCount} frame{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}
      
      {/* Batch Actions */}
      <div className="flex gap-2">
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
          Save {selectedCount > 0 ? `${selectedCount} Frame${selectedCount !== 1 ? 's' : ''}` : 'All Frames'}
        </button>
        
        <button
          onClick={handleRemoveFrames}
          disabled={selectedCount === 0}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${selectedCount > 0
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <IconTrash size={16} />
          Remove {selectedCount > 0 ? `${selectedCount} Frame${selectedCount !== 1 ? 's' : ''}` : 'Selected'}
        </button>
      </div>
    </div>
  );
}; 