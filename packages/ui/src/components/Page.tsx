import React from 'react';
import { useUIContext } from '../context/UIContext';
import { Frame } from './Frame';

export const Page: React.FC = () => {
  const { page, frames, selectedFrameIds } = useUIContext();
  
  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl"
      style={{
        width: `${page.width}px`,
        height: `${page.height}px`,
        backgroundImage: page.imageData ? `url(${page.imageData})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Render all frames */}
      {Object.values(frames).map(frame => (
        <Frame
          key={frame.id}
          id={frame.id}
          isActive={selectedFrameIds.length === 1 && selectedFrameIds[0] === frame.id}
        />
      ))}
    </div>
  );
}; 