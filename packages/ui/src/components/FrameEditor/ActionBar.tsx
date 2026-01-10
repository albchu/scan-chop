import React from 'react';
import {
  IconTrash,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconPlayerTrackPrev,
  IconPlayerTrackNext,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { FrameData } from '@workspace/shared';
import { useUIStore } from '../../stores';
import { UseFrameNavigationResult } from '../../hooks/useFrameNavigation';
import { ActionButton } from './ActionButton';

interface ActionBarProps {
  frame: FrameData;
  navigation: UseFrameNavigationResult;
}

export const ActionBar: React.FC<ActionBarProps> = ({ frame, navigation }) => {
  const updateFrame = useUIStore((state) => state.updateFrame);
  const removeFrame = useUIStore((state) => state.removeFrame);
  const setCurrentFrameId = useUIStore((state) => state.setCurrentFrameId);
  const frameList = useUIStore(state => Object.values(state.framesByPage).flat());
  
  const handleRotate = async () => {
    try {
      const result = await window.backend.invoke('workspace:rotateFrame', frame);
      if (result.success) {
        // Update frame orientation in store
        updateFrame(frame.id, {
          orientation: result.data.orientation,
        });
      } else {
        toast.error(result.error || 'Failed to rotate frame');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rotate frame');
    }
  };

  const handleSave = async () => {
    try {
      const result = await window.backend.invoke('workspace:saveFrame', frame);
      if (result.success) {
        toast.success(`Saved to ${result.data.filePath}`);
      } else if (result.error !== 'cancelled') {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save frame');
    }
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
