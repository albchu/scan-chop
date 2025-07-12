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
  const { currentPage, currentPageFrames, updateFrame, pageLoadingState } = useUIContext();

  if (!currentPage) {
    return (
      <div
        data-page="true"
        className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
        style={{ width: 2480, height: 3508, position: 'relative' }}
      >
        <GridPattern />
        <EmptyState />
      </div>
    );
  }

  const pageStyles: PageStyles = {
    width: currentPage.width,
    height: currentPage.height,
    backgroundImage: pageLoadingState === 'loaded' && currentPage.imageData 
      ? `url(${currentPage.imageData})` 
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  };

  const shouldShowEmptyState = pageLoadingState === 'empty' && !currentPage.imageData;
  const shouldShowLoadingState = pageLoadingState === 'loading';

  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
      style={pageStyles}
    >
      {/* Grid pattern overlay - always visible */}
      <GridPattern />

      {/* Conditional loading states */}
      {shouldShowEmptyState && <EmptyState />}
      {shouldShowLoadingState && <LoadingState />}

      {/* Frames - always rendered but may be hidden behind loading/empty states */}
      {currentPageFrames.map((frame) => (
        <Frame 
          key={frame.id} 
          frame={frame} 
          updateFrame={updateFrame} 
        />
      ))}
    </div>
  );
}; 