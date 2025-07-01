import React from 'react';
import { Frame } from './Frame';
import { useUIContext } from '../context/UIContext';

export const Page: React.FC = () => {
  const { page, frames, selectedFrameIds, updateFrame } = useUIContext();

  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300 cursor-crosshair"
      style={{
        width: `${page.width}px`,
        height: `${page.height}px`,
        backgroundImage: page.imageData ? `url(${page.imageData})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      {/* Page background pattern */}
      <div className="absolute inset-0 opacity-10">
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

      {Object.values(frames).map((frame) => (
        <Frame key={frame.id} frame={frame} updateFrame={updateFrame} />
      ))}
    </div>
  );
};
