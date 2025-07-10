import React, { useCallback } from 'react';
import { UIContextProvider, useUIContext } from '../context/UIContext';
import { workspaceApi } from '../api/workspace';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { FileExplorer } from './FileExplorer';
import { ThreePanelLayout } from './Layout';

const EditorContent: React.FC = () => {
  const { updatePage, setPageLoadingState } = useUIContext();
  
  const handleFileSelect = useCallback(async (path: string) => {
    console.log('File selected:', path);
    
    // Set loading state when starting to load an image
    setPageLoadingState('loading');
    
    try {
      // Load the image as base64 with max dimensions for display
      // This prevents loading huge images that could slow down the UI
      const imageData = await workspaceApi.loadImage(path, {
        maxWidth: 2048,   // Max width for display
        maxHeight: 2048,  // Max height for display
      });
      
      // Update the page with the new image data
      updatePage({ imageData });
      
      // Set loaded state after successful load
      setPageLoadingState('loaded');
      
      console.log('Image loaded and set as page background');
    } catch (error) {
      console.error('Failed to load image:', error);
      
      // Revert to empty state on error
      setPageLoadingState('empty');
      
      // Could show an error notification here
    }
  }, [updatePage, setPageLoadingState]);

  return (
    <ThreePanelLayout
      leftPanel={<FileExplorer onFileSelect={handleFileSelect} />}
      rightPanel={<FramesPreview />}
      initialLeftWidth={20}
      initialCenterWidth={60}
      minPanelWidth={10}
    >
      <Canvas />
    </ThreePanelLayout>
  );
};

export const Editor: React.FC = () => {
  return (
    <UIContextProvider>
      <EditorContent />
    </UIContextProvider>
  );
}; 