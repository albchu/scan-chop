import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DirectoryNode } from '@workspace/shared';
import { FileRow } from './FileRow';
import { useWorkspace } from '../../context/WorkspaceContext';

// Extended node type for UI state
interface TreeNode extends DirectoryNode {
  level: number;
  isExpanded: boolean;
  isLoading?: boolean;
  children?: TreeNode[];
}

interface Props {
  rootNode: DirectoryNode | null;
  rootPath?: string;  // New prop to identify the root
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onSetAsRoot?: (path: string) => void;  // New callback
}

export const FileList: React.FC<Props> = ({
  rootNode,
  rootPath,
  selectedFile,
  onFileSelect,
  onSetAsRoot,
}) => {
  const { loadSubDirectory } = useWorkspace();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  // Convert DirectoryNode to TreeNode with UI state
  const convertToTreeNode = useCallback((
    node: DirectoryNode,
    level: number = 0
  ): TreeNode => {
    return {
      ...node,
      level,
      isExpanded: false,
      isLoading: false,
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

  const findNodeByPath = useCallback(
    (nodes: TreeNode[], targetPath: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === targetPath) return node;
        if (node.children) {
          const found = findNodeByPath(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const handleToggle = useCallback(
    async (node: TreeNode) => {
      if (!node.isDirectory) return;

      // If collapsing, just update the state
      if (node.isExpanded) {
        setTree((prev) =>
          updateNodeByPath(prev, node.path, (n) => ({ 
            ...n, 
            isExpanded: false 
          }))
        );
        return;
      }

      // Check if we need to load children
      if (node.hasChildren && (!node.childrenLoaded || !node.children || node.children.length === 0)) {
        // Set loading state
        setLoadingPaths(prev => new Set(prev).add(node.path));
        setTree((prev) =>
          updateNodeByPath(prev, node.path, (n) => ({ 
            ...n, 
            isLoading: true 
          }))
        );

        try {
          // Load the subdirectory
          console.log('[FileList] Loading children for:', node.path);
          const loadedNode = await loadSubDirectory(node.path);
          
          // Convert loaded children to TreeNodes
          const children = loadedNode.children?.map(child => 
            convertToTreeNode(child, node.level + 1)
          ) || [];

          // Update tree with loaded children
          setTree((prev) =>
            updateNodeByPath(prev, node.path, (n) => ({
              ...n,
              isExpanded: true,
              isLoading: false,
              childrenLoaded: true,
              children
            }))
          );
        } catch (error) {
          console.error('[FileList] Error loading children:', error);
          // Clear loading state on error
          setTree((prev) =>
            updateNodeByPath(prev, node.path, (n) => ({ 
              ...n, 
              isLoading: false 
            }))
          );
        } finally {
          setLoadingPaths(prev => {
            const newSet = new Set(prev);
            newSet.delete(node.path);
            return newSet;
          });
        }
      } else {
        // Children already loaded, just expand
        setTree((prev) =>
          updateNodeByPath(prev, node.path, (n) => ({ 
            ...n, 
            isExpanded: true 
          }))
        );
      }
    },
    [updateNodeByPath, loadSubDirectory, convertToTreeNode]
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