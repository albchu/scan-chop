import React from 'react';

// Folder icon component
const FolderIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

// Error state when directory contents cannot be read
interface FileListErrorProps {
  message: string;
}

export const FileListError: React.FC<FileListErrorProps> = ({ message }) => (
  <div className="h-full w-full flex items-center justify-center px-4">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-3 text-red-500">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.382 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <p className="text-red-400 font-medium">Directory Error</p>
      <p className="text-gray-400 text-sm mt-1">{message}</p>
    </div>
  </div>
);

// Placeholder shown when no directory has been selected yet
export const FileListNoDir: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <FolderIcon className="w-16 h-16 text-gray-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-200 mb-2">No Directory Selected</h3>
    <p className="text-sm text-gray-400 max-w-md">
      Enter a directory path above to browse and select image files for processing.
    </p>
  </div>
); 