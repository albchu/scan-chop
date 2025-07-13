import React from 'react';

export const LoadingState: React.FC = () => (
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    <p className="mt-4 text-gray-600">Loading image...</p>
  </div>
); 