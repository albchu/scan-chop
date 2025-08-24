import React from 'react';
import { useUIStore } from '../stores';
import { Canvas } from './Canvas';
import { FrameEditor } from './FrameEditor';

export const TabbedView: React.FC = () => {
  const activeView = useUIStore((state) => state.activeView);
  const setActiveView = useUIStore((state) => state.setActiveView);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Tab Bar - VSCode/Chrome style */}
      <div className="flex bg-gray-900 border-b border-gray-700">
        <button
          className={`
            flex-1 py-2.5 px-4 text-sm font-medium transition-all duration-150
            ${activeView === 'canvas' 
              ? 'bg-gray-800 text-gray-100 border-b-2 border-blue-500 relative' 
              : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200 border-b-2 border-transparent'
            }
          `}
          onClick={() => setActiveView('canvas')}
        >
          <span className="relative z-10">Canvas</span>
          {activeView === 'canvas' && (
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
          )}
        </button>
        
        <button
          className={`
            flex-1 py-2.5 px-4 text-sm font-medium transition-all duration-150
            ${activeView === 'frame-editor' 
              ? 'bg-gray-800 text-gray-100 border-b-2 border-blue-500 relative' 
              : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200 border-b-2 border-transparent'
            }
          `}
          onClick={() => setActiveView('frame-editor')}
        >
          <span className="relative z-10">Frame Editor</span>
          {activeView === 'frame-editor' && (
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'canvas' && <Canvas />}
        {activeView === 'frame-editor' && <FrameEditor />}
      </div>
    </div>
  );
};
