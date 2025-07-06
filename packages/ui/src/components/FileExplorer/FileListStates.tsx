import React from 'react';
import { IconFolder, IconAlertTriangle } from '@tabler/icons-react';

// Error state when directory contents cannot be read
interface FileListErrorProps {
  message: string;
}

export const FileListError: React.FC<FileListErrorProps> = ({ message }) => (
  <div className="h-full w-full flex items-center justify-center px-4">
    <div className="text-center">
      <IconAlertTriangle size={48} className="mx-auto mb-3 text-red-500" />
      <p className="text-red-400 font-medium">Directory Error</p>
      <p className="text-gray-400 text-sm mt-1">{message}</p>
    </div>
  </div>
);

// Placeholder shown when no directory has been selected yet
export const FileListNoDir: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <IconFolder size={64} className="text-gray-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-200 mb-2">No Directory Selected</h3>
    <p className="text-sm text-gray-400 max-w-md">
      Enter a directory path above to browse and select image files for processing.
    </p>
  </div>
); 