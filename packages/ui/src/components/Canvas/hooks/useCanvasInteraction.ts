import { useCallback, useMemo } from 'react';
import { useUIContext } from '../../../context/UIContext';
import { useZoomContext } from '../../../context/ZoomContext';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

interface UseCanvasInteractionProps {
  isDragging: boolean;
  isCommandPressed: boolean;
}

interface UseCanvasInteractionReturn {
  handleCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  defaultFrameWidth: number;
  defaultFrameHeight: number;
}

export const useCanvasInteraction = ({ 
  isDragging, 
  isCommandPressed 
}: UseCanvasInteractionProps): UseCanvasInteractionReturn => {
  const { page, addFrame, selectFrame } = useUIContext();
  const { zoom, baseScale } = useZoomContext();

  const [defaultFrameWidth, defaultFrameHeight] = useMemo(() => {
    return [
      page.width * DEFAULT_FRAME_SIZE_RATIO,
      page.height * DEFAULT_FRAME_SIZE_RATIO,
    ];
  }, [page]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't add frames if we were dragging or if Command key is pressed
    if (isDragging || isCommandPressed) return;

    // Check if we clicked on a frame
    const target = e.target as HTMLElement;
    const frameElement = target.closest('[data-frame-id]');

    if (frameElement) {
      const frameId = frameElement.getAttribute('data-frame-id');
      if (frameId) {
        selectFrame(frameId);
      }
    } 
    // Clicked on the page
    else if (target.closest('[data-page="true"]')) {
      // Clicked on page background
      const pageElement = target.closest('[data-page="true"]') as HTMLElement;
      const rect = pageElement.getBoundingClientRect();
      
      // Account for both base scale and zoom when calculating click position
      const totalScale = baseScale * (zoom / 100);
      
      // Add frame at click position with default size
      // Container coordinates in html start at top left corner.
      // UX should feel better if the frame origin is spawned at the click position instead of top left corner.
      // That's why we subtract half the frame size from the click position.
      const x = (e.clientX - rect.left) / totalScale - defaultFrameWidth / 2;
      const y = (e.clientY - rect.top) / totalScale - defaultFrameHeight / 2;

      addFrame({
        x,
        y,
        width: defaultFrameWidth,
        height: defaultFrameHeight,
        rotation: 0,
      });
    }
  }, [
    isDragging, 
    isCommandPressed, 
    addFrame, 
    selectFrame, 
    baseScale, 
    zoom, 
    defaultFrameWidth, 
    defaultFrameHeight
  ]);

  return {
    handleCanvasClick,
    defaultFrameWidth,
    defaultFrameHeight,
  };
}; 