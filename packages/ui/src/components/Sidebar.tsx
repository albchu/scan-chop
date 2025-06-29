import React from 'react';
import { useUIContext } from '../context/UIContext';
import { ToolMode } from '@workspace/shared';

export const Sidebar: React.FC = () => {
  const { mode, setMode, undo, redo, history } = useUIContext();
  
  const handleToolSelect = (tool: ToolMode) => {
    setMode(tool);
  };
  
  return (
    <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-4">
      {/* Tool Selection */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleToolSelect('select')}
          className={`
            p-3 rounded-lg transition-colors
            ${mode === 'select' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-700 hover:bg-gray-600'
            }
          `}
          title="Select Tool"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2z"
            />
          </svg>
        </button>
        
        <button
          onClick={() => handleToolSelect('add')}
          className={`
            p-3 rounded-lg transition-colors
            ${mode === 'add' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-700 hover:bg-gray-600'
            }
          `}
          title="Add Frame Tool"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-10 h-px bg-gray-700" />
      
      {/* History Controls */}
      <div className="flex flex-col gap-2">
        <button
          onClick={undo}
          disabled={history.undoStack.length === 0}
          className={`
            p-3 rounded-lg transition-colors
            ${history.undoStack.length > 0
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }
          `}
          title={history.undoStack.length > 0 
            ? `Undo: ${history.undoStack[history.undoStack.length - 1].label}`
            : 'Nothing to undo'
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
        
        <button
          onClick={redo}
          disabled={history.redoStack.length === 0}
          className={`
            p-3 rounded-lg transition-colors
            ${history.redoStack.length > 0
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }
          `}
          title={history.redoStack.length > 0 
            ? `Redo: ${history.redoStack[history.redoStack.length - 1].label}`
            : 'Nothing to redo'
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}; 