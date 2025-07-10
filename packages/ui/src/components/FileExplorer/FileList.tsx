import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DirectoryNode } from '@workspace/shared';
import { FileRow } from './FileRow';

// Extended node type for UI state
interface TreeNode extends DirectoryNode {
  level: number;
  isExpanded: boolean;
  children?: TreeNode[];
}

interface Props {
  rootNode: DirectoryNode | null;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

export const FileList: React.FC<Props> = ({
  rootNode,
  selectedFile,
  onFileSelect,
}) => {
  const [tree, setTree] = useState<TreeNode[]>([]);

  // Convert DirectoryNode to TreeNode with UI state
  const convertToTreeNode = useCallback((
    node: DirectoryNode,
    level: number = 0
  ): TreeNode => {
    return {
      ...node,
      level,
      isExpanded: false,
      children: node.children?.map(child => 
        convertToTreeNode(child, level + 1)
      ),
    };
  }, []);

  // Initialize tree when rootNode changes
  useEffect(() => {
    if (!rootNode) {
      setTree([]);
      return;
    }

    // If rootNode has children, use them as top-level nodes
    // Otherwise, use the rootNode itself
    const nodes = rootNode.children && rootNode.children.length > 0
      ? rootNode.children.map(child => convertToTreeNode(child, 0))
      : [convertToTreeNode(rootNode, 0)];

    setTree(nodes);
  }, [rootNode, convertToTreeNode]);

  const updateNodeByPath = useCallback(
    (nodes: TreeNode[], targetPath: string, updater: (n: TreeNode) => TreeNode): TreeNode[] => {
      return nodes.map((n) => {
        if (n.path === targetPath) {
          return updater(n);
        }
        if (n.children) {
          return { 
            ...n, 
            children: updateNodeByPath(n.children, targetPath, updater) 
          };
        }
        return n;
      });
    },
    []
  );

  const handleToggle = useCallback(
    (node: TreeNode) => {
      if (!node.isDirectory) return;

      setTree((prev) =>
        updateNodeByPath(prev, node.path, (n) => ({ 
          ...n, 
          isExpanded: !n.isExpanded 
        }))
      );
    },
    [updateNodeByPath]
  );

  // Flatten tree for rendering
  const flatList = useMemo(() => {
    const list: TreeNode[] = [];
    
    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        list.push(node);
        if (node.isExpanded && node.children) {
          traverse(node.children);
        }
      }
    };
    
    traverse(tree);
    return list;
  }, [tree]);

  if (!rootNode) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No directory selected</p>
      </div>
    );
  }

  if (flatList.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No image files found in this directory</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {flatList.map((node) => (
        <FileRow
          key={node.path}
          node={node}
          isSelected={selectedFile === node.path}
          isLoading={false} // No more async loading!
          onToggle={handleToggle}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
}; 