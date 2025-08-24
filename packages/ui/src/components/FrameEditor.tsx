import React from 'react';
import { useUIStore, useFrameCount, useSelectedCount, useCurrentPageFrames } from '../stores';
import { IconArrowLeft, IconPhoto, IconSquare, IconRotate } from '@tabler/icons-react';

export const FrameEditor: React.FC = () => {
  const switchToCanvas = useUIStore((state) => state.switchToCanvas);
  const frameCount = useFrameCount();
  const selectedCount = useSelectedCount();
  const selectedFrameIds = useUIStore((state) => state.selectedFrameIds);
  const currentPageFrames = useCurrentPageFrames();
  const currentPage = useUIStore((state) => state.currentPage);

  // Get first selected frame for demo purposes
  const selectedFrame = selectedFrameIds.length > 0 
    ? currentPageFrames.find(f => f.id === selectedFrameIds[0])
    : null;

  return (
    <div className="h-full bg-gray-800 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-100">Frame Editor</h2>
          <button
            onClick={switchToCanvas}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <IconArrowLeft size={18} />
            Back to Canvas
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <IconPhoto className="text-blue-500" size={24} />
              <div>
                <p className="text-sm text-gray-400">Total Frames</p>
                <p className="text-2xl font-semibold text-gray-100">{frameCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <IconSquare className="text-green-500" size={24} />
              <div>
                <p className="text-sm text-gray-400">Selected</p>
                <p className="text-2xl font-semibold text-gray-100">{selectedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <IconRotate className="text-purple-500" size={24} />
              <div>
                <p className="text-sm text-gray-400">Page Status</p>
                <p className="text-2xl font-semibold text-gray-100">
                  {currentPage ? 'Loaded' : 'Empty'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Frame Details */}
        {selectedFrame && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Selected Frame: {selectedFrame.label}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Frame ID:</span>
                  <span className="text-gray-200 font-mono">{selectedFrame.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position X:</span>
                  <span className="text-gray-200">{Math.round(selectedFrame.x)}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Y:</span>
                  <span className="text-gray-200">{Math.round(selectedFrame.y)}px</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Width:</span>
                  <span className="text-gray-200">{Math.round(selectedFrame.width)}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Height:</span>
                  <span className="text-gray-200">{Math.round(selectedFrame.height)}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rotation:</span>
                  <span className="text-gray-200">{selectedFrame.rotation.toFixed(1)}°</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            {selectedFrame.imageData && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Frame Preview:</p>
                <div className="bg-gray-800 rounded-lg p-4 flex justify-center">
                  <img 
                    src={selectedFrame.imageData} 
                    alt={selectedFrame.label}
                    className="max-w-full max-h-64 object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder Features */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Frame Properties (Placeholder)
          </h3>
          
          <div className="space-y-4">
            {/* Hardcoded property editors for demo */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Frame Name</label>
              <input 
                type="text" 
                value={selectedFrame?.label || 'No frame selected'}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Export Quality</label>
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200">
                <option>High (100%)</option>
                <option>Medium (85%)</option>
                <option>Low (70%)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Output Format</label>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">PNG</button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg">JPEG</button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg">WebP</button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Frame IDs List */}
        {selectedFrameIds.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Selected Frame IDs
            </h3>
            <div className="space-y-1">
              {selectedFrameIds.map(id => (
                <div key={id} className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded">
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
