import React from 'react';
import type { TreeNode } from '@workspace/shared';
import { IconChevronRight, IconChevronDown, IconFolder, IconFile, IconPhoto, IconLoader2 } from '@tabler/icons-react';

interface FileRowProps {
  node: TreeNode;
  isSelected: boolean;
  isLoading: boolean;
  onToggle: (node: TreeNode) => void;
  onFileSelect: (path: string) => void;
}

export const FileRow: React.FC<FileRowProps> = ({
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
            <IconLoader2 className="w-3 h-3 animate-spin" />
          ) : node.isExpanded ? (
            <IconChevronDown size={12} />
          ) : (
            <IconChevronRight size={12} />
          )
        )}
      </div>

      {/* Icon */}
      <div className="mr-2">
        {node.isDirectory ? (
          <IconFolder size={16} className="text-blue-400" />
        ) : node.isSupported ? (
          <IconPhoto size={16} className="text-gray-400" />
        ) : (
          <IconFile size={16} className="text-gray-400" />
        )}
      </div>

      {/* Name */}
      <span className="truncate font-medium flex-1" title={node.name}>
        {node.name}
      </span>
    </div>
  );
}; 