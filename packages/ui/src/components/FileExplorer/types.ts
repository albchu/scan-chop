import type { DirectoryNode } from '@workspace/shared';

// Extended node type for UI state
export interface TreeNode extends DirectoryNode {
  level: number;
  isExpanded: boolean;
  isLoading?: boolean;
  children?: TreeNode[];
}

// Props for FileList component
export interface FileListProps {
  rootNode: DirectoryNode | null;
  rootPath?: string;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onSetAsRoot?: (path: string) => void;
}

// State for tree management
export interface TreeState {
  tree: TreeNode[];
  loadingPaths: Set<string>;
} 