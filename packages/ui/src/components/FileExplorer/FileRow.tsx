import React from 'react';
import { IconChevronRight, IconChevronDown, IconFolder, IconFolderOpen, IconPhoto, IconLoader2 } from '@tabler/icons-react';

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  hasChildren?: boolean;
  childrenLoaded?: boolean;
  level: number;
  isExpanded: boolean;
  isLoading?: boolean;
  children?: TreeNode[];
}

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
    } else {
      onFileSelect(node.path);
    }
  };

  // Determine if we should show the chevron
  const showChevron = node.isDirectory && (node.hasChildren || !node.childrenLoaded);

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
        {showChevron && (
          isLoading || node.isLoading ? (
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
          node.isExpanded ? (
            <IconFolderOpen size={16} className="text-blue-400" />
          ) : (
            <IconFolder size={16} className="text-blue-400" />
          )
        ) : (
          <IconPhoto size={16} className="text-gray-400" />
        )}
      </div>

      {/* Name */}
      <span className="truncate font-medium flex-1" title={node.name}>
        {node.name}
      </span>
      
      {/* Optional: Show count of children if loaded but not expanded */}
      {node.isDirectory && node.childrenLoaded && !node.isExpanded && node.children && node.children.length > 0 && (
        <span className="text-xs text-gray-500 ml-2">
          ({node.children.length})
        </span>
      )}
    </div>
  );
}; 