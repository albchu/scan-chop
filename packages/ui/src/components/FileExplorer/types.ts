export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isSupported?: boolean; // true for image files (jpg, png, gif, etc.)
}

export interface TreeNode extends DirectoryEntry {
  level: number;
  isExpanded?: boolean;
  children?: TreeNode[];
} 