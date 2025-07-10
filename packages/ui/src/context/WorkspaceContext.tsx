import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useCallback,
} from 'react';
import { workspaceApi } from '../api/workspace';
import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';

interface WorkspaceState {
  currentDirectory: string | null;
  rootDirectory: string | null;  // New: tracks the displayed root
  directoryTree: DirectoryNode | null;
  isLoading: boolean;
  error: string | null;
}

interface WorkspaceContextProps {
  state: WorkspaceState;
  loadDirectory: (path: string, options?: LoadDirectoryOptions) => Promise<void>;
  loadSubDirectory: (path: string) => Promise<DirectoryNode>;
  setRootDirectory: (path: string) => Promise<void>;
  clearError: () => void;
  refreshDirectory: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextProps | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    currentDirectory: null,
    rootDirectory: null,
    directoryTree: null,
    isLoading: false,
    error: null,
  });

  const loadDirectory = useCallback(async (path: string, options?: LoadDirectoryOptions): Promise<void> => {
    console.log('[WorkspaceContext] Loading directory:', path);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      // Default to loading only 1 level deep for initial load
      const defaultOptions: LoadDirectoryOptions = {
        depth: 1,
        preloadDepth: 2,
        excludeEmpty: true,
        ...options
      };
      
      const tree = await workspaceApi.loadDirectory(path, defaultOptions);
      
      setState({
        currentDirectory: path,
        rootDirectory: path,  // Set root directory when loading a new directory
        directoryTree: tree,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[WorkspaceContext] Error loading directory:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load directory',
      }));
    }
  }, []);

  const loadSubDirectory = useCallback(async (path: string): Promise<DirectoryNode> => {
    console.log('[WorkspaceContext] Loading subdirectory:', path);
    
    try {
      // Load subdirectory with more depth for expansion
      const tree = await workspaceApi.loadDirectory(path, {
        depth: 3,      // Load 3 levels deep when expanding
        preloadDepth: 1,  // Preload 1 additional level
        excludeEmpty: true
      });
      
      return tree;
    } catch (error) {
      console.error('[WorkspaceContext] Error loading subdirectory:', error);
      throw error;
    }
  }, []);

  const setRootDirectory = useCallback(async (path: string): Promise<void> => {
    console.log('[WorkspaceContext] Setting root directory:', path);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      // Load the subdirectory as the new root
      const tree = await workspaceApi.loadDirectory(path, {
        depth: 1,
        preloadDepth: 2,
        excludeEmpty: true
      });
      
      setState({
        currentDirectory: path,
        rootDirectory: path,  // Update root directory
        directoryTree: tree,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[WorkspaceContext] Error setting root directory:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to set root directory',
      }));
    }
  }, []);

  const refreshDirectory = useCallback(async (): Promise<void> => {
    if (!state.currentDirectory) return;
    
    // Clear cache for current directory
    await workspaceApi.clearCache(state.currentDirectory);
    
    // Reload with same options
    await loadDirectory(state.currentDirectory);
  }, [state.currentDirectory, loadDirectory]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: WorkspaceContextProps = {
    state,
    loadDirectory,
    loadSubDirectory,
    setRootDirectory,
    clearError,
    refreshDirectory,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextProps {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
