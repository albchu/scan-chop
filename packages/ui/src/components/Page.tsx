import React from 'react';
import { Frame } from './Frame';
import { useUIContext } from '../context/UIContext';

export const Page: React.FC = () => {
  const { page, frames, selectedFrameIds, updateFrame, pageLoadingState } = useUIContext();

  // Common grid pattern overlay
  const GridPattern = () => (
    <div className="absolute inset-0 opacity-10 pointer-events-none">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );

  // Loading state UI
  const LoadingState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading image...</p>
      </div>
    </div>
  );

  // Empty state UI
  const EmptyState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg 
          className="mx-auto h-12 w-12 text-gray-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No image loaded</p>
        <p className="text-xs text-gray-400">Select an image from the file explorer</p>
      </div>
    </div>
  );

  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
      style={{
        width: `${page.width}px`,
        height: `${page.height}px`,
        backgroundImage: pageLoadingState === 'loaded' && page.imageData ? `url(${page.imageData})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      {/* Show grid pattern for all states */}
      <GridPattern />

      {/* Conditionally render based on loading state */}
      {pageLoadingState === 'empty' && <EmptyState />}
      {pageLoadingState === 'loading' && <LoadingState />}

      {/* Always render frames, but they might be hidden behind loading/empty states */}
      {Object.values(frames).map((frame) => (
        <Frame key={frame.id} frame={frame} updateFrame={updateFrame} />
      ))}
    </div>
  );
};
