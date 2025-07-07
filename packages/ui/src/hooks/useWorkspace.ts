import { useState, useEffect, useCallback } from 'react';
import { DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';
import { useBackend } from './useBackend';

interface WorkspaceImage {
  path: string;
  width: number;
  height: number;
  dataUrl: string;
}

interface WorkspaceState {
  currentDirectory: string | null;
  imagePaths: string[];
  subdirectories: string[];
  loadedImages: Map<string, WorkspaceImage>;
  isLoading: boolean;
  error: string | null;
}

interface UseWorkspaceReturn {
  state: WorkspaceState;
  loadDirectory: (path: string) => Promise<void>;
  clearError: () => void;
}

export function useWorkspace(): UseWorkspaceReturn {
  const backend = useBackend();
  const [state, setState] = useState<WorkspaceState>({
    currentDirectory: null,
    imagePaths: [],
    subdirectories: [],
    loadedImages: new Map(),
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Only set up listeners if we have the workspace API
    if (!backend || !(backend as any).workspace) {
      return;
    }

    const workspace = (backend as any).workspace;

    // Set up listeners for workspace events
    const unsubscribeDirectory = workspace.onDirectoryReady((payload: DirectoryReadyPayload) => {
      setState(prev => ({
        ...prev,
        currentDirectory: payload.path,
        imagePaths: payload.imagePaths,
        subdirectories: payload.subdirectories,
        isLoading: false,
      }));
    });

    const unsubscribeImage = workspace.onImageReady((payload: ImageReadyPayload) => {
      setState(prev => ({
        ...prev,
        loadedImages: new Map(prev.loadedImages).set(payload.path, {
          path: payload.path,
          width: payload.width,
          height: payload.height,
          dataUrl: payload.dataUrl,
        }),
      }));
    });

    const unsubscribeError = workspace.onError((error: { message: string }) => {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeDirectory();
      unsubscribeImage();
      unsubscribeError();
    };
  }, [backend]);

  const loadDirectory = useCallback(async (path: string) => {
    if (!backend || !(backend as any).workspace) {
      setState(prev => ({
        ...prev,
        error: 'Workspace API not available',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      loadedImages: new Map(), // Clear previous images
    }));

    try {
      await (backend as any).workspace.loadDirectory(path);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load directory',
        isLoading: false,
      }));
    }
  }, [backend]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    loadDirectory,
    clearError,
  };
} 