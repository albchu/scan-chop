import type { DirectoryNode } from '@workspace/shared';
import type { TreeNode } from '../types';

/**
 * Convert a DirectoryNode to TreeNode with UI state
 */
export const convertToTreeNode = (
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
};

/**
 * Update a node in the tree by path
 */
export const updateNodeByPath = (
  nodes: TreeNode[],
  targetPath: string,
  updater: (n: TreeNode) => TreeNode
): TreeNode[] => {
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
};

/**
 * Flatten a tree structure for rendering
 */
export const flattenTree = (tree: TreeNode[]): TreeNode[] => {
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
};

/**
 * Initialize tree from root node
 */
export const initializeTree = (rootNode: DirectoryNode | null): TreeNode[] => {
  if (!rootNode) {
    return [];
  }

  // If rootNode has children, use them as top-level nodes
  // Otherwise, use the rootNode itself
  const nodes = rootNode.children && rootNode.children.length > 0
    ? rootNode.children.map(child => convertToTreeNode(child, 0))
    : [convertToTreeNode(rootNode, 0)];

  return nodes;
}; 