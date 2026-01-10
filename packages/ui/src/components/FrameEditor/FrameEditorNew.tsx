import React, { useEffect } from 'react';
import { useUIStore } from '../../stores';
import { useFrameNavigation } from '../../hooks/useFrameNavigation';
import { EditableLabel } from '../common';
import { ActionBar } from './ActionBar';

export const FrameEditorNew: React.FC = () => {
  const frameList = useUIStore(state => Object.values(state.framesByPage).flat());
  const currentFrameId = useUIStore(state => state.currentFrameId);
  const setCurrentFrameId = useUIStore(state => state.setCurrentFrameId);
  const updateFrame = useUIStore(state => state.updateFrame);
  const setActiveView = useUIStore(state => state.setActiveView);
  
  // Find current frame
  const currentFrame = frameList.find(f => f.id === currentFrameId);
  
  // Navigation (no keyboard support)
  const navigation = useFrameNavigation({
    frames: frameList,
    currentFrameId,
    onFrameChange: setCurrentFrameId,
  });

  // Auto-select first frame with image if none selected
  useEffect(() => {
    const framesWithImages = frameList.filter(f => f.imageData);
    if (!currentFrameId && framesWithImages.length > 0) {
      setCurrentFrameId(framesWithImages[0].id);
    }
  }, [currentFrameId, frameList, setCurrentFrameId]);

  // Empty state
  if (!currentFrame || !currentFrame.imageData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <p className="text-lg mb-4 text-gray-400">No frame selected</p>
          <button 
            onClick={() => setActiveView('canvas')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Canvas to select frames
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 relative overflow-hidden">
      {/* Frame title at the top */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
        <div className="bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-lg">
          <EditableLabel
            value={currentFrame.label}
            onChange={(label) => updateFrame(currentFrame.id, { label })}
            className="text-lg text-gray-200 font-medium"
          />
        </div>
      </div>

      {/* Main content area - frame image */}
      <div className="absolute inset-0 pt-20 pb-24 flex items-center justify-center p-4">
        <div className="frame-editor-image-animated max-w-full max-h-full">
          <img 
            src={currentFrame.imageData}
            alt={currentFrame.label}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{ transform: `rotate(${currentFrame.orientation}deg)` }}
          />
        </div>
      </div>

      {/* Frame info overlay */}
      <div className="absolute top-4 right-4 bg-gray-900/60 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-gray-300">
        <div className="flex items-center gap-4">
          <span>{navigation.currentIndex + 1} / {navigation.totalFrames}</span>
          <span className="text-xs">
            {currentFrame.imageScaleFactor 
              ? `${Math.round(currentFrame.width * currentFrame.imageScaleFactor)} × ${Math.round(currentFrame.height * currentFrame.imageScaleFactor)}`
              : `${Math.round(currentFrame.width)} × ${Math.round(currentFrame.height)}`
            }
          </span>
        </div>
      </div>

      {/* Fixed action bar at bottom center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <ActionBar 
          frame={currentFrame}
          navigation={navigation}
        />
      </div>
    </div>
  );
};
