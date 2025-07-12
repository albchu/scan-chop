import React from 'react';

export const EmptyState: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 pointer-events-none">
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