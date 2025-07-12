import React, { useState, useCallback, useMemo } from 'react';
import { workspaceApi } from '../../../api/workspace';
import { useUIContext } from '../../../context/UIContext';
import { useZoomContext } from '../../../context/ZoomContext';
import { DEFAULT_FRAME_SIZE_RATIO, WHITE_THRESHOLD_DEFAULT } from '@workspace/shared';

interface UseCanvasInteractionProps {
  isDragging: boolean;
  isCommandPressed: boolean;
}

interface UseCanvasInteractionReturn {
  handleCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => Promise<void>;
  isGenerating: boolean;
}

export const useCanvasInteraction = ({ 
  isDragging, 
  isCommandPressed 
}: UseCanvasInteractionProps): UseCanvasInteractionReturn => {
  const { page, addFrame, selectFrame, currentImagePath } = useUIContext();
  const { zoom, baseScale } = useZoomContext();
  const [isGenerating, setIsGenerating] = useState(false);

  const [defaultFrameWidth, defaultFrameHeight] = useMemo(() => {
    return [
      page.width * DEFAULT_FRAME_SIZE_RATIO,
      page.height * DEFAULT_FRAME_SIZE_RATIO,
    ];
  }, [page]);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('[useCanvasInteraction] Click handler called');
    console.log('[useCanvasInteraction] currentImagePath:', currentImagePath);
    console.log('[useCanvasInteraction] isDragging:', isDragging);
    console.log('[useCanvasInteraction] isCommandPressed:', isCommandPressed);
    
    // Don't add frames if we were dragging
    if (isDragging) return;

    // Check if we clicked on a frame
    const target = e.target as HTMLElement;
    console.log('[useCanvasInteraction] Click target:', target.tagName, target.className);
    
    const frameElement = target.closest('[data-frame-id]');

    if (frameElement) {
      const frameId = frameElement.getAttribute('data-frame-id');
      if (frameId) {
        selectFrame(frameId);
      }
    } 
    // Clicked on the page
    else if (target.closest('[data-page="true"]')) {
      console.log('[useCanvasInteraction] Clicked on page element');
      // Clicked on page background
      const pageElement = target.closest('[data-page="true"]') as HTMLElement;
      const rect = pageElement.getBoundingClientRect();
      
      // Account for both base scale and zoom when calculating click position
      const totalScale = baseScale * (zoom / 100);
      
      // Calculate click position in displayed image coordinates
      const displayX = (e.clientX - rect.left) / totalScale;
      const displayY = (e.clientY - rect.top) / totalScale;
      
      console.log('[useCanvasInteraction] Page element found, coordinates:', { displayX, displayY });
      
      // Use seed-based frame generation by default
      if (currentImagePath) {
        try {
          setIsGenerating(true);
          
          // No need to scale coordinates anymore - backend expects display coordinates
          console.log('Click coordinates - Display:', { x: displayX, y: displayY });
          
          // Generate frame using seed coordinates in display image space
          const frameData = await workspaceApi.generateFrame(
            currentImagePath,
            { x: displayX, y: displayY },
            { 
              whiteThreshold: WHITE_THRESHOLD_DEFAULT
              // Backend handles downsampling internally now
            }
          );
          
          console.log('[useCanvasInteraction] Frame generated:', frameData);
          console.log('[useCanvasInteraction] Frame has imageData:', !!frameData.imageData);
          
          // Frame data is already in display coordinates, no scaling needed
          addFrame(frameData);
          
        } catch (error) {
          console.error('Failed to generate frame:', error);
          // If frame generation fails, fall back to manual frame creation
          addFrame({
            x: displayX - defaultFrameWidth / 2,
            y: displayY - defaultFrameHeight / 2,
            width: defaultFrameWidth,
            height: defaultFrameHeight,
            rotation: 0,
          });
        } finally {
          setIsGenerating(false);
        }
      } else {
        console.warn('No image loaded - cannot generate frame from seed');
        // Create a manual frame
        addFrame({
          x: displayX - defaultFrameWidth / 2,
          y: displayY - defaultFrameHeight / 2,
          width: defaultFrameWidth,
          height: defaultFrameHeight,
          rotation: 0,
        });
      }
    } else {
      console.log('[useCanvasInteraction] Click did not match frame or page element');
      console.log('[useCanvasInteraction] Checking for data-page attribute:', document.querySelector('[data-page="true"]'));
    }
  }, [isDragging, isCommandPressed, page, addFrame, selectFrame, zoom, baseScale, 
      defaultFrameWidth, defaultFrameHeight, currentImagePath]);

  return { handleCanvasClick, isGenerating };
}; 