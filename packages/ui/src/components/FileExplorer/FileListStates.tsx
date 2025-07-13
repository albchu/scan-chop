import React from 'react';
import { IconFolder, IconAlertTriangle } from '@tabler/icons-react';

// Error state when directory contents cannot be read
interface FileListErrorProps {
  message: string;
  onRetry?: () => void;
}

export const FileListError: React.FC<FileListErrorProps> = ({ message, onRetry }) => (
  <div className="h-full w-full flex items-center justify-center px-4">
    <div className="text-center">
      <IconAlertTriangle size={48} className="mx-auto mb-3 text-red-500" />
      <p className="text-red-400 font-medium">Directory Error</p>
      <p className="text-gray-400 text-sm mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

// Placeholder shown when no directory has been selected yet
interface FileListNoDirProps {
  onBrowse?: () => void;
}

export const FileListNoDir: React.FC<FileListNoDirProps> = ({ onBrowse }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <IconFolder size={64} className="text-gray-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-200 mb-2">No Directory Selected</h3>
    <p className="text-sm text-gray-400 max-w-md mb-4">
      Enter a directory path above to browse and select image files for processing.
    </p>
    {onBrowse && (
      <button
        onClick={onBrowse}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      >
        Browse Files
      </button>
    )}
  </div>
); 