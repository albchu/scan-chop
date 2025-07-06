import React from 'react';
import { TreeNode } from './types';

interface HierarchicalFileRowProps {
  node: TreeNode;
  isSelected: boolean;
  isLoading: boolean;
  onToggle: (node: TreeNode) => void;
  onFileSelect: (path: string) => void;
}

// Icons
const DisclosureClosed: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const DisclosureOpen: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const FolderIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);
const FileIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export const HierarchicalFileRow: React.FC<HierarchicalFileRowProps> = ({
  node,
  isSelected,
  isLoading,
  onToggle,
  onFileSelect,
}) => {
  const handleClick = () => {
    if (node.isDirectory) {
      onToggle(node);
    } else if (node.isSupported) {
      onFileSelect(node.path);
    }
  };

  return (
    <div
      className={`flex items-center px-2 py-1 rounded-md text-sm transition-colors duration-150 ${
        isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700 hover:text-gray-100'
      } cursor-pointer`}
      style={{ paddingLeft: `${node.level * 16 + 8}px` }}
      onClick={handleClick}
    >
      {/* Disclosure triangle or placeholder */}
      <div className="flex items-center justify-center w-4 h-4 mr-1">
        {node.isDirectory && (
          isLoading ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : node.isExpanded ? (
            <DisclosureOpen className="w-3 h-3" />
          ) : (
            <DisclosureClosed className="w-3 h-3" />
          )
        )}
      </div>

      {/* Icon */}
      <div className="mr-2">
        {node.isDirectory ? (
          <FolderIcon className="w-4 h-4 text-blue-400" />
        ) : (
          <FileIcon className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Name */}
      <span className="truncate font-medium flex-1" title={node.name}>
        {node.name}
      </span>
    </div>
  );
}; 