import React, { useState, useCallback, useEffect } from 'react';
import { FileList } from './FileList';
import { FileListError, FileListNoDir } from './FileListStates';
import type { DirectoryEntry } from '@workspace/shared';
import { IconLoader2 } from '@tabler/icons-react';
import {
  DEFAULT_INITIAL_PATH,
  getInitialEntries,
  INITIAL_SELECTED_FILE,
  INITIAL_ERROR_MESSAGE,
  readDirectory,
} from './mockFileSystem';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PathInput } from './PathInput';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect: onFileSelectProp,
}) => {
  const {state, loadDirectory} = useWorkspace();
  // TODO: When you come back to this: You need to take the fileTree and use it to populate the file explorer
  
  // const [currentPath, setCurrentPath] = useState<string>(DEFAULT_INITIAL_PATH);
  const [selectedFile, setSelectedFile] = useState<string | null>(
    INITIAL_SELECTED_FILE
  );

  console.log('[Renderer] FileExplorer:', {state, selectedFile});
  // const [directoryEntries, setDirectoryEntries] =
  //   useState<DirectoryEntry[]>(getInitialEntries());
  const [errorMessage, setErrorMessage] = useState<string | null>(
    INITIAL_ERROR_MESSAGE
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileSelect = useCallback(
    (path: string) => {
      console.log('[DEBUGGIN] FileExplorer handleFileSelect:', {path});
      setSelectedFile(path);
      if (onFileSelectProp) {
        onFileSelectProp(path);
      }
    },
    [onFileSelectProp]
  );

  const handlePathChange = useCallback(async (path: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    loadDirectory(path);

    // try {
    //   const entries = await readDirectory(path);
    //   setCurrentPath(path);
    //   setDirectoryEntries(entries);
    //   setSelectedFile(null); // Clear selection when changing directories
    // } catch (error) {
    //   setErrorMessage(
    //     error instanceof Error ? error.message : 'Failed to read directory'
    //   );
    //   setDirectoryEntries([]);
    // } finally {
    //   setIsLoading(false);
    // }
  }, []);

  const handlePathValidation = useCallback(
    (isValid: boolean, error?: string) => {
      if (!isValid && error) {
        setErrorMessage(error);
      } else {
        setErrorMessage(null);
      }
    },
    []
  );

  // Load initial directory on mount
  // useEffect(() => {
  //   if (currentPath) {
  //     handlePathChange(currentPath);
  //   }
  // }, []);

  const renderFileListContent = () => {
    if (errorMessage) {
      return <FileListError message={errorMessage} />;
    }

    if (!state.currentDirectory) {
      return <FileListNoDir />;
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <IconLoader2 size={32} className="animate-spin text-gray-300" />
        </div>
      );
    }

    // file list view
    return (
      <div className="h-full w-full overflow-y-auto p-2">
        <FileList
          rootEntries={state.fileTree[state.currentDirectory] || []}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
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
