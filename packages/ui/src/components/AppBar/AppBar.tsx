import React from 'react';

interface AppBarProps {
  // Add props as needed in the future
}

export const AppBar: React.FC<AppBarProps> = () => {
  return (
    <header 
      className="w-full bg-gray-950 border-b border-gray-700 flex items-center px-4 py-2 h-14"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Logo/Title */}
        <h1 className="text-xl font-semibold text-white select-none">Scan Chop</h1>
        
        {/* Navigation items can be added here */}
        
        {/* Right side actions can be added here */}
      </div>
    </header>
  );
}; 