import React from 'react';
import {
  IconTrash,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconPlayerTrackPrev,
  IconPlayerTrackNext,
} from '@tabler/icons-react';
import { FrameData } from '@workspace/shared';
import { useUIStore } from '../../stores';
import { UseFrameNavigationResult } from '../../hooks/useFrameNavigation';
import { ActionButton } from './ActionButton';

interface ActionBarProps {
  frame: FrameData;
  navigation: UseFrameNavigationResult;
}

export const ActionBar: React.FC<ActionBarProps> = ({ frame, navigation }) => {
  const setOrientation = useUIStore((state) => state.setOrientation);
  const removeFrame = useUIStore((state) => state.removeFrame);
  const setCurrentFrameId = useUIStore((state) => state.setCurrentFrameId);
  const frameList = useUIStore(state => Object.values(state.framesByPage).flat());
  
  const handleRotate = () => {
    // Cycle orientation: 0 → 90 → 180 → 270 → 0
    const nextOrientation = ((frame.orientation + 90) % 360) as 0 | 90 | 180 | 270;
    setOrientation(frame.id, nextOrientation);
  };

  const handleSave = () => {
    console.log('TODO: Implement save functionality for frame:', frame.id);
  };

  const handleDelete = () => {
    // Find next frame before deletion
    const currentIndex = frameList.findIndex(f => f.id === frame.id);
    const nextFrame = frameList[currentIndex + 1] || frameList[currentIndex - 1];
    
    removeFrame(frame.id);
    
    // Navigate to next frame or null if no frames left
    setCurrentFrameId(nextFrame?.id || null);
  };

  const hasMultipleFrames = navigation.totalFrames > 1;

  return (
    <div className="
      action-bar-animated
      bg-gray-900/60 backdrop-blur-md rounded-2xl
      border border-gray-700/50 shadow-2xl
      p-2 flex flex-row items-center gap-2
    ">
      {hasMultipleFrames && (
        <>
          <ActionButton
            icon={<IconPlayerTrackPrev size={20} />}
            label="Previous"
            onClick={navigation.goToPrevious}
            disabled={!navigation.canGoPrevious}
          />

          <ActionButton
            icon={<IconPlayerTrackNext size={20} />}
            label="Next"
            onClick={navigation.goToNext}
            disabled={!navigation.canGoNext}
          />

          <div className="w-px h-8 bg-gray-600/50 mx-1" />
        </>
      )}

      <ActionButton
        icon={<IconRotateClockwise size={20} />}
        label="Rotate"
        onClick={handleRotate}
      />

      <ActionButton 
        icon={<IconDeviceFloppy size={20} />} 
        label="Save" 
        onClick={handleSave} 
      />

      <div className="w-px h-8 bg-gray-600/50 mx-1" />

      <ActionButton
        icon={<IconTrash size={20} />}
        label="Delete"
        onClick={handleDelete}
        variant="danger"
      />
    </div>
  );
};
