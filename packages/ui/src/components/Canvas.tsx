import React from 'react';
import { useUIContext } from '../context/UIContext';
import { Page } from './Page';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

export const Canvas: React.FC = () => {
  const { mode, page, addFrame, selectFrame, clearSelection } = useUIContext();
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if we clicked on a frame
    const target = e.target as HTMLElement;
    const frameElement = target.closest('[data-frame-id]');
    
    if (frameElement) {
      const frameId = frameElement.getAttribute('data-frame-id');
      if (mode === 'select' && frameId) {
        selectFrame(frameId);
      }
    } else if (target.closest('[data-page="true"]')) {
      // Clicked on page background
      if (mode === 'add') {
        const pageElement = target.closest('[data-page="true"]') as HTMLElement;
        const rect = pageElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Add frame at click position with default size
        addFrame({
          x,
          y,
          width: page.width * DEFAULT_FRAME_SIZE_RATIO,
          height: page.height * DEFAULT_FRAME_SIZE_RATIO,
          rotation: 0
        });
      } else if (mode === 'select') {
        clearSelection();
      }
    }
  };
  
  return (
    <div 
      className={`
        h-full bg-gray-700 flex items-center justify-center overflow-auto
        ${mode === 'add' ? 'cursor-crosshair' : 'cursor-default'}
      `}
      onClick={handleCanvasClick}
    >
      <Page />
    </div>
  );
}; 