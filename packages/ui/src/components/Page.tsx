import React from 'react';
import { FrameDebug } from './FrameDebug';
// import { useUIContext } from '../context/UIContext';
// import { Frame } from './Frame';

export const Page: React.FC = () => {
  // Sample page dimensions
  const pageWidth = 800;
  const pageHeight = 600;
  
  // Sample frames for testing
  const sampleFrames = [
    { id: '1', x: 100, y: 100, width: 200, height: 150, rotation: 0 },
    { id: '2', x: 350, y: 200, width: 180, height: 120, rotation: 15 },
    { id: '3', x: 150, y: 350, width: 160, height: 160, rotation: -10 },
  ];

  // Original implementation (commented out):
  // const { page, frames, selectedFrameIds } = useUIContext();
  
  return (
    <div
      data-page="true"
      className="relative bg-gray-100 overflow-hidden shadow-2xl border-2 border-gray-300"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        position: 'relative'
      }}
      // Original style:
      // style={{
      //   width: `${page.width}px`,
      //   height: `${page.height}px`,
      //   backgroundImage: page.imageData ? `url(${page.imageData})` : undefined,
      //   backgroundSize: 'cover',
      //   backgroundPosition: 'center',
      //   backgroundRepeat: 'no-repeat'
      // }}
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
            backgroundSize: '20px 20px'
          }}
        />
      </div>
      
      {/* Page title */}
      <div className="absolute top-4 left-4 text-lg font-bold text-gray-700 bg-white/80 px-3 py-1 rounded shadow">
        Moveable Debug Page
      </div>
      
      {/* Render sample frames */}
      {sampleFrames.map(frame => (
        <FrameDebug
          key={frame.id}
          id={frame.id}
          initialX={frame.x}
          initialY={frame.y}
          initialWidth={frame.width}
          initialHeight={frame.height}
          initialRotation={frame.rotation}
        />
      ))}

      {/* Original frame rendering (commented out): */}
      {/* {Object.values(frames).map(frame => (
        <Frame
          key={frame.id}
          id={frame.id}
          isActive={selectedFrameIds.length === 1 && selectedFrameIds[0] === frame.id}
        />
      ))} */}
    </div>
  );
}; 