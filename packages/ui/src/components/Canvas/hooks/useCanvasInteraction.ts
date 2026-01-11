import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { workspaceApi } from '../../../api/workspace';
import { useUIStore, useCanvasStore } from '../../../stores';
import { WHITE_THRESHOLD_DEFAULT } from '@workspace/shared';

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
  // Granular subscriptions
  const currentPage = useUIStore((state) => state.currentPage);
  const currentPageId = useUIStore((state) => state.currentPageId);
  const addFrame = useUIStore((state) => state.addFrame);
  const selectFrame = useUIStore((state) => state.selectFrame);
  
  const zoom = useCanvasStore((state) => state.zoom);
  const baseScale = useCanvasStore((state) => state.baseScale);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('[useCanvasInteraction] Click handler called');
    console.log('[useCanvasInteraction] currentPageId:', currentPageId);
    console.log('[useCanvasInteraction] currentPage?.imagePath:', currentPage?.imagePath);
    console.log('[useCanvasInteraction] isDragging:', isDragging);
    console.log('[useCanvasInteraction] isCommandPressed:', isCommandPressed);
    
    // Don't add frames if we were dragging or if no page is loaded
    if (isDragging || !currentPage || !currentPageId) return;

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
      if (currentPage.imagePath) {
        try {
          setIsGenerating(true);
          
          // No need to scale coordinates anymore - backend expects display coordinates
          console.log('Click coordinates - Display:', { x: displayX, y: displayY });
          
          // Generate frame using seed coordinates in display image space
          const frameData = await workspaceApi.generateFrame(
            currentPage.imagePath,
            { x: displayX, y: displayY },
            { 
              whiteThreshold: WHITE_THRESHOLD_DEFAULT
              // Backend handles downsampling internally now
            }
          );
          
          console.log('[useCanvasInteraction] Frame generated:', frameData);
          console.log('[useCanvasInteraction] Frame has imageData:', !!frameData.imageData);
          console.log('[useCanvasInteraction] Frame has pageId:', frameData.pageId);
          
          // Frame data is already in display coordinates, no scaling needed
          addFrame(frameData);
          
        } catch (error) {
          console.error('Failed to generate frame:', error);
          toast.error('Could not detect a frame at this location. Please try again.');
        } finally {
          setIsGenerating(false);
        }
      } else {
        console.warn('No image loaded - cannot generate frame from seed');
        toast.error('No image loaded');
      }
    } else {
      console.log('[useCanvasInteraction] Click did not match frame or page element');
      console.log('[useCanvasInteraction] Checking for data-page attribute:', document.querySelector('[data-page="true"]'));
    }
  }, [isDragging, isCommandPressed, currentPage, currentPageId, addFrame, selectFrame, zoom, baseScale]);

  return { handleCanvasClick, isGenerating };
}; 