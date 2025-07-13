import React from 'react';
import { Frame } from '../Frame';
import { useUIContext } from '../../context/UIContext';
import { GridPattern } from './GridPattern';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

interface PageStyles {
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  position: 'relative';
}

export const Page: React.FC = () => {
  const { currentPage, currentPageFrames, updateFrame, pageLoadingState } =
    useUIContext();

  // Determine container dimensions
  const containerStyle = {
    width: currentPage?.width || 2480,
    height: currentPage?.height || 3508,
  };

  // If no page has ever been loaded, show empty state
  if (!currentPage && pageLoadingState === 'empty') {
    return (
      <div
        data-page="true"
        className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
        style={containerStyle}
      >
        <GridPattern />
        <EmptyState />
      </div>
    );
  }

  const pageStyles: PageStyles = {
    width: currentPage?.width || 2480,
    height: currentPage?.height || 3508,
    backgroundImage: currentPage?.imageData
      ? `url(${currentPage.imageData})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  };

  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
      style={containerStyle}
    >
      {/* Page content layer - fades out when loading, fades in when loaded */}
      <div 
        className={`
          absolute inset-0 transition-opacity duration-300 ease-in-out
          ${pageLoadingState === 'loading' ? 'opacity-0 pointer-events-none' : ''}
          ${pageLoadingState === 'loaded' ? 'opacity-100' : ''}
          ${pageLoadingState === 'empty' ? 'opacity-0 pointer-events-none' : ''}
        `}
        style={pageStyles}
      >
        {currentPage && pageLoadingState !== 'loading' && (
          <>
            {/* Grid pattern */}
            <GridPattern />
            
            {/* Frames - now positioned within the same container as the background */}
            {currentPageFrames.map((frame) => (
              <Frame key={frame.id} frame={frame} updateFrame={updateFrame} />
            ))}
          </>
        )}
      </div>
      
      {/* Loading overlay - fades in when loading */}
      <div 
        className={`
          absolute inset-0 bg-gray-50 transition-opacity duration-300 ease-in-out flex items-center justify-center pointer-events-none
          ${pageLoadingState === 'loading' ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <LoadingState />
      </div>

      {/* Empty state overlay - only shows when no page loaded */}
      {!currentPage && pageLoadingState === 'empty' && (
        <div className="absolute inset-0 pointer-events-none">
          <EmptyState />
        </div>
      )}
    </div>
  );
};
