import React, { useCallback } from 'react';
import { useUIStore } from '../stores';
import { workspaceApi } from '../api/workspace';
import { TabbedView } from './TabbedView';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { FileExplorer } from './FileExplorer';
import { ThreePanelLayout } from './Layout';
import { AppBar } from './AppBar';

const EditorContent: React.FC = () => {
  // Using stores directly for better performance
  const updatePage = useUIStore((state) => state.updatePage);
  const setPageLoadingState = useUIStore((state) => state.setPageLoadingState);
  
  const handleFileSelect = useCallback(async (path: string) => {
    console.log('File selected:', path);
    
    // Set loading state when starting to load an image
    setPageLoadingState('loading');
    
    try {
      // Load the image as base64 (backend now always returns full size)
      const imageDataResponse = await workspaceApi.loadImage(path);
      
      // Update the page with the new image data and dimensions
      // UPDATE_PAGE action will handle pageId generation
      updatePage({ 
        imageData: imageDataResponse.imageData,
        width: imageDataResponse.width,
        height: imageDataResponse.height,
        originalWidth: imageDataResponse.originalWidth,
        originalHeight: imageDataResponse.originalHeight,
      }, path); // imagePath is required
      
      // Set loaded state after successful load
      setPageLoadingState('loaded');
      
      console.log('Image loaded and set as page background with dimensions:', 
        imageDataResponse.width, 'x', imageDataResponse.height,
        'Original dimensions:', imageDataResponse.originalWidth, 'x', imageDataResponse.originalHeight);
    } catch (error) {
      console.error('Failed to load image:', error);
      
      // Revert to empty state on error
      setPageLoadingState('empty');
      
      // Could show an error notification here
    }
  }, [updatePage, setPageLoadingState]);

  return (
    <div className="flex flex-col h-screen">
      <AppBar />
      <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          leftPanel={<FileExplorer onFileSelect={handleFileSelect} />}
          rightPanel={<FramesPreview />}
          initialLeftWidth={20}
          initialCenterWidth={60}
          minPanelWidth={10}
        >
          <TabbedView />
        </ThreePanelLayout>
      </div>
    </div>
  );
};

export const Editor: React.FC = () => {
  return <EditorContent />;
}; 