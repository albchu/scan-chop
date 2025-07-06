import React from 'react';
import { PathInput } from './PathInput';

interface FileExplorerHeaderProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onPathValidation: (isValid: boolean, error?: string) => void;
}

export const FileExplorerHeader: React.FC<FileExplorerHeaderProps> = ({
  currentPath,
  onPathChange,
  onPathValidation,
}) => {
  return (
    <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-3">
      {/* Path input */}
      <div>
        <PathInput
          currentPath={currentPath}
          onPathChange={onPathChange}
          onPathValidation={onPathValidation}
        />
      </div>
    </div>
  );
}; 