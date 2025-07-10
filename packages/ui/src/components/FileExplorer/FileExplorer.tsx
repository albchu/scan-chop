import React, { useState, useCallback } from 'react';
import { FileList } from './FileList';
import { FileListError, FileListNoDir } from './FileListStates';
import { IconLoader2 } from '@tabler/icons-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PathInput } from './PathInput';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect: onFileSelectProp,
}) => {
  const { state, loadDirectory, clearError, refreshDirectory, setRootDirectory } = useWorkspace();
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (path: string) => {
      console.log('[FileExplorer] File selected:', path);
      setSelectedFile(path);
      if (onFileSelectProp) {
        onFileSelectProp(path);
      }
    },
    [onFileSelectProp]
  );

  const handlePathChange = useCallback(async (path: string) => {
    setSelectedFile(null); // Clear selection when changing directories
    await loadDirectory(path);
  }, [loadDirectory]);

  const handleRefresh = useCallback(async () => {
    setSelectedFile(null);
    await refreshDirectory();
  }, [refreshDirectory]);

  const handleSetAsRoot = useCallback(async (path: string) => {
    console.log('[FileExplorer] Setting as root:', path);
    setSelectedFile(null); // Clear selection when changing root
    await setRootDirectory(path);
  }, [setRootDirectory]);

  const handlePathValidation = useCallback(
    (isValid: boolean, error?: string) => {
      if (isValid) {
        clearError();
      }
      // PathInput handles its own error display
    },
    [clearError]
  );

  const renderFileListContent = () => {
    if (state.error) {
      return <FileListError message={state.error} />;
    }

    if (!state.currentDirectory || !state.directoryTree) {
      return <FileListNoDir />;
    }

    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <IconLoader2 size={32} className="animate-spin text-gray-300" />
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-y-auto p-2">
        <FileList
          rootNode={state.directoryTree}
          rootPath={state.rootDirectory || state.currentDirectory}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onSetAsRoot={handleSetAsRoot}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-3">
        <PathInput
          currentPath={state.currentDirectory || ''}
          onPathChange={handlePathChange}
          onPathValidation={handlePathValidation}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="flex-1 min-h-0">{renderFileListContent()}</div>

      {/* Footer with selection info */}
      {selectedFile && (
        <div className="flex-shrink-0 px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 truncate flex-1">
              Selected: <span className="text-gray-200">{selectedFile}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
