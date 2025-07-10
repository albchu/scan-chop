import React from 'react';

interface CanvasDebugInfoProps {
  pageWidth: number;
  pageHeight: number;
  baseScale: number;
  totalScale: number;
}

export const CanvasDebugInfo: React.FC<CanvasDebugInfoProps> = ({
  pageWidth,
  pageHeight,
  baseScale,
  totalScale,
}) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded p-2 text-xs text-gray-300">
      <div>Page: {pageWidth} x {pageHeight}</div>
      <div>Base Scale: {(baseScale * 100).toFixed(1)}%</div>
      <div>Total Scale: {(totalScale * 100).toFixed(1)}%</div>
    </div>
  );
}; 