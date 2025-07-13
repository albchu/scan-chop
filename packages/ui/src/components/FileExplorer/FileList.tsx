import React from 'react';
import { FileRow } from './FileRow';
import { useWorkspaceStore } from '../../stores';
import { useTreeState } from './hooks/useTreeState';
import type { FileListProps } from './types';

export const FileList: React.FC<FileListProps> = ({
  rootNode,
  rootPath,
  selectedFile,
  onFileSelect,
  onSetAsRoot,
}) => {
  const loadSubDirectory = useWorkspaceStore((state) => state.loadSubDirectory);
  const { flatList, handleToggle } = useTreeState({ 
    rootNode, 
    loadSubDirectory 
  });

  // Early returns for empty states
  if (!rootNode) {
    return <EmptyState message="No directory selected" />;
  }

  if (flatList.length === 0) {
    return <EmptyState message="No image files found in this directory" />;
  }

  // Determine the actual root path (either rootPath prop or the rootNode's path)
  const actualRootPath = rootPath || rootNode.path;

  return (
    <div className="space-y-1">
      {flatList.map((node) => (
        <FileRow
          key={node.path}
          node={node}
          isSelected={selectedFile === node.path}
          isLoading={node.isLoading || false}
          isRoot={node.path === actualRootPath}
          onToggle={handleToggle}
          onFileSelect={onFileSelect}
          onSetAsRoot={onSetAsRoot}
        />
      ))}
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-8">
    <p className="text-gray-400">{message}</p>
  </div>
); 