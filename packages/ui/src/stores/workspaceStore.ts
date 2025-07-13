import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { workspaceApi } from '../api/workspace';
import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';

interface WorkspaceState {
  // State
  currentDirectory: string | null;
  rootDirectory: string | null;
  directoryTree: DirectoryNode | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadDirectory: (path: string, options?: LoadDirectoryOptions) => Promise<void>;
  loadSubDirectory: (path: string) => Promise<DirectoryNode>;
  setRootDirectory: (path: string) => Promise<void>;
  clearError: () => void;
  refreshDirectory: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentDirectory: null,
      rootDirectory: null,
      directoryTree: null,
      isLoading: false,
      error: null,
      
      // Actions
      loadDirectory: async (path: string, options?: LoadDirectoryOptions) => {
        console.log('[WorkspaceStore] Loading directory:', path);
        
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // Default to loading only 1 level deep for initial load
          const defaultOptions: LoadDirectoryOptions = {
            depth: 1,
            preloadDepth: 2,
            excludeEmpty: true,
            ...options
          };
          
          const tree = await workspaceApi.loadDirectory(path, defaultOptions);
          
          set((state) => {
            state.currentDirectory = path;
            state.rootDirectory = path;
            state.directoryTree = tree;
            state.isLoading = false;
            state.error = null;
          });
        } catch (error) {
          console.error('[WorkspaceStore] Error loading directory:', error);
          
          set((state) => {
            state.isLoading = false;
            state.error = error instanceof Error ? error.message : 'Failed to load directory';
          });
        }
      },
      
      loadSubDirectory: async (path: string): Promise<DirectoryNode> => {
        console.log('[WorkspaceStore] Loading subdirectory:', path);
        
        try {
          // Load subdirectory with more depth for expansion
          const tree = await workspaceApi.loadDirectory(path, {
            depth: 3,      // Load 3 levels deep when expanding
            preloadDepth: 1,  // Preload 1 additional level
            excludeEmpty: true
          });
          
          return tree;
        } catch (error) {
          console.error('[WorkspaceStore] Error loading subdirectory:', error);
          throw error;
        }
      },
      
      setRootDirectory: async (path: string) => {
        console.log('[WorkspaceStore] Setting root directory:', path);
        
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // Load the subdirectory as the new root
          const tree = await workspaceApi.loadDirectory(path, {
            depth: 1,
            preloadDepth: 2,
            excludeEmpty: true
          });
          
          set((state) => {
            state.currentDirectory = path;
            state.rootDirectory = path;
            state.directoryTree = tree;
            state.isLoading = false;
            state.error = null;
          });
        } catch (error) {
          console.error('[WorkspaceStore] Error setting root directory:', error);
          
          set((state) => {
            state.isLoading = false;
            state.error = error instanceof Error ? error.message : 'Failed to set root directory';
          });
        }
      },
      
      refreshDirectory: async () => {
        const { currentDirectory, loadDirectory } = get();
        
        if (!currentDirectory) return;
        
        // Clear cache for current directory
        await workspaceApi.clearCache(currentDirectory);
        
        // Reload with same options
        await loadDirectory(currentDirectory);
      },
      
      clearError: () => set((state) => {
        state.error = null;
      }),
    })),
    {
      name: 'workspace-store',
    }
  )
);

// Selectors
export const useWorkspaceState = () => useWorkspaceStore((state) => ({
  currentDirectory: state.currentDirectory,
  rootDirectory: state.rootDirectory,
  directoryTree: state.directoryTree,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useWorkspaceActions = () => useWorkspaceStore((state) => ({
  loadDirectory: state.loadDirectory,
  loadSubDirectory: state.loadSubDirectory,
  setRootDirectory: state.setRootDirectory,
  clearError: state.clearError,
  refreshDirectory: state.refreshDirectory,
})); 