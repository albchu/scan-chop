import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useCallback,
} from 'react';
import { workspaceApi } from '../api/workspace';
import type { DirectoryNode } from '@workspace/shared';

interface WorkspaceState {
  currentDirectory: string | null;
  directoryTree: DirectoryNode | null;
  isLoading: boolean;
  error: string | null;
}

interface WorkspaceContextProps {
  state: WorkspaceState;
  loadDirectory: (path: string) => Promise<void>;
  clearError: () => void;
  refreshDirectory: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextProps | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    currentDirectory: null,
    directoryTree: null,
    isLoading: false,
    error: null,
  });

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    console.log('[WorkspaceContext] Loading directory:', path);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const tree = await workspaceApi.loadDirectory(path);
      
      setState({
        currentDirectory: path,
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

  const refreshDirectory = useCallback(async (): Promise<void> => {
    if (!state.currentDirectory) return;
    
    // Clear cache for current directory
    await workspaceApi.clearCache(state.currentDirectory);
    
    // Reload
    await loadDirectory(state.currentDirectory);
  }, [state.currentDirectory, loadDirectory]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: WorkspaceContextProps = {
    state,
    loadDirectory,
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
