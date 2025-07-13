import React, { useState, useCallback } from 'react';
import { FileList } from './FileList';
import { FileListError, FileListNoDir } from './FileListStates';
import { IconLoader2 } from '@tabler/icons-react';
import { useWorkspaceStore } from '../../stores';
import { PathInput } from './PathInput';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect: onFileSelectProp,
}) => {
  // Granular subscriptions for optimal performance
  const currentDirectory = useWorkspaceStore((state) => state.currentDirectory);
  const rootDirectory = useWorkspaceStore((state) => state.rootDirectory);
  const directoryTree = useWorkspaceStore((state) => state.directoryTree);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const error = useWorkspaceStore((state) => state.error);
  
  // Actions are stable references
  const loadDirectory = useWorkspaceStore((state) => state.loadDirectory);
  const clearError = useWorkspaceStore((state) => state.clearError);
  const refreshDirectory = useWorkspaceStore((state) => state.refreshDirectory);
  const setRootDirectory = useWorkspaceStore((state) => state.setRootDirectory);
  
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
    console.log('[FileExplorer] handlePathChange:', path);
    await loadDirectory(path);
  }, [loadDirectory]);
  
  const handleRefresh = useCallback(async () => {
    console.log('[FileExplorer] Refreshing current directory');
    await refreshDirectory();
  }, [refreshDirectory]);
  
  const handleSetAsRoot = useCallback(async (path: string) => {
    console.log('[FileExplorer] Setting as root:', path);
    await setRootDirectory(path);
  }, [setRootDirectory]);

  const renderFileListContent = () => {
    if (error) {
      return (
        <FileListError 
          message={error} 
          onRetry={clearError} 
        />
      );
    }

    if (!directoryTree) {
      return <FileListNoDir onBrowse={() => loadDirectory('/')} />;
    }

    return (
      <FileList
        rootNode={directoryTree}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onSetAsRoot={handleSetAsRoot}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <PathInput
        currentPath={currentDirectory || ''}
        onPathChange={handlePathChange}
        onRefresh={handleRefresh}
        onPathValidation={(isValid, error) => {
          if (!isValid && error) {
            console.log('[FileExplorer] Path validation error:', error);
          }
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <IconLoader2 className="animate-spin text-gray-500" size={32} />
          </div>
        ) : (
          renderFileListContent()
        )}
      </div>
    </div>
  );
};
