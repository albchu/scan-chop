import React, { useCallback, useMemo, useState } from 'react';
import { useUIContext } from '../../../context/UIContext';
import { useZoomContext } from '../../../context/ZoomContext';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';
import { workspaceApi } from '../../../api/workspace';

interface UseCanvasInteractionProps {
  isDragging: boolean;
  isCommandPressed: boolean;
}

interface UseCanvasInteractionReturn {
  handleCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
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
      
      // Calculate click position in displayed image coordinates
      const displayX = (e.clientX - rect.left) / totalScale;
      const displayY = (e.clientY - rect.top) / totalScale;
      
      // Use seed-based frame generation by default
      if (currentImagePath) {
        try {
          setIsGenerating(true);
          
          // Scale coordinates from displayed image space to original image space
          const scaleX = (page.originalWidth || page.width) / page.width;
          const scaleY = (page.originalHeight || page.height) / page.height;
          const originalX = displayX * scaleX;
          const originalY = displayY * scaleY;
          
          console.log('Click coordinates - Display:', { x: displayX, y: displayY }, 
                      'Original:', { x: originalX, y: originalY },
                      'Scale factors:', { scaleX, scaleY });
          
          // Generate frame using seed coordinates in original image space
          const frameData = await workspaceApi.generateFrame(
            currentImagePath,
            { x: originalX, y: originalY },
            { 
              whiteThreshold: 220,
              downsampleFactor: 0.5 
            }
          );
          
          // Scale frame coordinates back to displayed image space
          const scaledFrameData = {
            x: frameData.x / scaleX,
            y: frameData.y / scaleY,
            width: frameData.width / scaleX,
            height: frameData.height / scaleY,
            rotation: frameData.rotation,
          };
          
          // Add the scaled frame
          addFrame(scaledFrameData);
          
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
        // No image loaded, create manual frame
        console.warn('No image loaded for frame generation, using manual frame creation');
        addFrame({
          x: displayX - defaultFrameWidth / 2,
          y: displayY - defaultFrameHeight / 2,
          width: defaultFrameWidth,
          height: defaultFrameHeight,
          rotation: 0,
        });
      }
    }
  }, [isDragging, isCommandPressed, page, addFrame, selectFrame, zoom, baseScale, 
      defaultFrameWidth, defaultFrameHeight, currentImagePath]);

  return { handleCanvasClick, isGenerating };
}; 