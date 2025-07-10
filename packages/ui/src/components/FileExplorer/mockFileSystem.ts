import type { DirectoryEntry } from '@workspace/shared';

// Default initial path
export const DEFAULT_INITIAL_PATH = '/Users/john/Pictures/Scans';

// Mock file system tree structure
const mockFileSystem: Record<string, DirectoryEntry[]> = {
  '/': [
    { name: 'Users', path: '/Users', isDirectory: true },
    { name: 'Applications', path: '/Applications', isDirectory: true },
    { name: 'Documents', path: '/Documents', isDirectory: true },
  ],
  '/Users': [
    { name: 'john', path: '/Users/john', isDirectory: true },
    { name: 'shared', path: '/Users/shared', isDirectory: true },
  ],
  '/Users/john': [
    { name: 'Pictures', path: '/Users/john/Pictures', isDirectory: true },
    { name: 'Documents', path: '/Users/john/Documents', isDirectory: true },
    { name: 'Downloads', path: '/Users/john/Downloads', isDirectory: true },
    { name: 'Desktop', path: '/Users/john/Desktop', isDirectory: true },
  ],
  '/Users/john/Pictures': [
    { name: 'Vacation', path: '/Users/john/Pictures/Vacation', isDirectory: true },
    { name: 'Scans', path: '/Users/john/Pictures/Scans', isDirectory: true },
    { name: 'profile.jpg', path: '/Users/john/Pictures/profile.jpg', isDirectory: false, isSupported: true },
    { name: 'wallpaper.png', path: '/Users/john/Pictures/wallpaper.png', isDirectory: false, isSupported: true },
    { name: 'readme.txt', path: '/Users/john/Pictures/readme.txt', isDirectory: false, isSupported: false },
  ],
  '/Users/john/Pictures/Vacation': [
    { name: 'beach-01.jpg', path: '/Users/john/Pictures/Vacation/beach-01.jpg', isDirectory: false, isSupported: true },
    { name: 'beach-02.jpg', path: '/Users/john/Pictures/Vacation/beach-02.jpg', isDirectory: false, isSupported: true },
    { name: 'sunset.png', path: '/Users/john/Pictures/Vacation/sunset.png', isDirectory: false, isSupported: true },
    { name: 'hotel.pdf', path: '/Users/john/Pictures/Vacation/hotel.pdf', isDirectory: false, isSupported: false },
  ],
  '/Users/john/Pictures/Scans': [
    { name: 'document-001.png', path: '/Users/john/Pictures/Scans/document-001.png', isDirectory: false, isSupported: true },
    { name: 'document-002.png', path: '/Users/john/Pictures/Scans/document-002.png', isDirectory: false, isSupported: true },
    { name: 'document-003.png', path: '/Users/john/Pictures/Scans/document-003.png', isDirectory: false, isSupported: true },
    { name: 'receipt-01.jpg', path: '/Users/john/Pictures/Scans/receipt-01.jpg', isDirectory: false, isSupported: true },
    { name: 'receipt-02.jpg', path: '/Users/john/Pictures/Scans/receipt-02.jpg', isDirectory: false, isSupported: true },
    { name: 'Archive', path: '/Users/john/Pictures/Scans/Archive', isDirectory: true },
  ],
  '/Users/john/Pictures/Scans/Archive': [
    { name: '2023', path: '/Users/john/Pictures/Scans/Archive/2023', isDirectory: true },
    { name: '2024', path: '/Users/john/Pictures/Scans/Archive/2024', isDirectory: true },
  ],
  '/Users/john/Pictures/Scans/Archive/2023': [
    { name: 'tax-form-1.png', path: '/Users/john/Pictures/Scans/Archive/2023/tax-form-1.png', isDirectory: false, isSupported: true },
    { name: 'tax-form-2.png', path: '/Users/john/Pictures/Scans/Archive/2023/tax-form-2.png', isDirectory: false, isSupported: true },
    { name: 'invoice-march.jpg', path: '/Users/john/Pictures/Scans/Archive/2023/invoice-march.jpg', isDirectory: false, isSupported: true },
  ],
};

// Get initial directory entries for the default path
export const getInitialEntries = (): DirectoryEntry[] => {
  const entries = mockFileSystem[DEFAULT_INITIAL_PATH] || [];
  // Sort directories first, then files
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
};

// Initial selected file (null by default)
export const INITIAL_SELECTED_FILE: string | null = null;

// Initial error message (null by default)
export const INITIAL_ERROR_MESSAGE: string | null = null;

// Mock function implementations
export const readDirectory = async (path: string): Promise<DirectoryEntry[]> => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const entries = mockFileSystem[path];
  if (!entries) {
    throw new Error(`Directory not found: ${path}`);
  }
  
  // Sort directories first, then files
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
};

export const validatePath = async (path: string): Promise<{isValid: boolean; error?: string}> => {
  // Simulate async validation
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (!path || path.trim() === '') {
    return { isValid: false, error: 'Path cannot be empty' };
  }
  
  if (!path.startsWith('/')) {
    return { isValid: false, error: 'Path must be absolute (start with /)' };
  }
  
  if (mockFileSystem[path]) {
    return { isValid: true };
  }
  
  return { isValid: false, error: 'Directory does not exist' };
};

// Helper to get supported file extensions
export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];

export const isImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}; 