import React from 'react';

export const GridPattern: React.FC = () => (
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