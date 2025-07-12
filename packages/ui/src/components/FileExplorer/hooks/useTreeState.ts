import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DirectoryNode } from '@workspace/shared';
import type { TreeNode } from '../types';
import { 
  initializeTree, 
  updateNodeByPath, 
  convertToTreeNode,
  flattenTree 
} from '../utils/treeUtils';

interface UseTreeStateOptions {
  rootNode: DirectoryNode | null;
  loadSubDirectory: (path: string) => Promise<DirectoryNode>;
}

export const useTreeState = ({ rootNode, loadSubDirectory }: UseTreeStateOptions) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  // Initialize tree when rootNode changes
  useEffect(() => {
    setTree(initializeTree(rootNode));
  }, [rootNode]);

  // Handle expand/collapse
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
          console.log('[useTreeState] Loading children for:', node.path);
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
          console.error('[useTreeState] Error loading children:', error);
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
    [loadSubDirectory]
  );

  // Flatten tree for rendering
  const flatList = useMemo(() => flattenTree(tree), [tree]);

  return {
    tree,
    flatList,
    loadingPaths,
    handleToggle,
  };
}; 