import { createContext, ReactNode, useEffect, useState } from 'react';
import { useBackend } from './BackendContext';
import { DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';

export const WorkspaceContext = createContext<WorkspaceState | null>(null);

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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const backend = useBackend();

  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);

  const value: WorkspaceState = {
    currentDirectory: '',
    imagePaths: [],
    subdirectories: [],
    loadedImages: new Map(),
    isLoading: false,
    error: null,
  };

  // Kickoff load of backend workspace data
  useEffect(() => {
    console.log('[Renderer] WorkspaceProvider triggering initWorkspace');
    backend.workspace.initWorkspace();
  }, []);

  // Workspace event listeners
  useEffect(() => {
    // Backend should always have workspace API now
    if (!backend || !backend.workspace) {
      console.error('Backend or workspace API not available', backend);
      return;
    }

    const { workspace } = backend;

    // Set up listeners for workspace events
    // const unsubscribeDirectory = workspace.onDirectoryReady(
    //   (payload: DirectoryReadyPayload) => {
    //     setState((prev) => ({
    //       ...prev,
    //       currentDirectory: payload.path,
    //       imagePaths: payload.imagePaths,
    //       subdirectories: payload.subdirectories,
    //       isLoading: false,
    //     }));
    //   }
    // );

    // const unsubscribeImage = workspace.onImageReady(
    //   (payload: ImageReadyPayload) => {
    //     setState((prev) => ({
    //       ...prev,
    //       loadedImages: new Map(prev.loadedImages).set(payload.path, {
    //         path: payload.path,
    //         width: payload.width,
    //         height: payload.height,
    //         dataUrl: payload.dataUrl,
    //       }),
    //     }));
    //   }
    // );

    // const unsubscribeError = workspace.onError((error: { message: string }) => {
    //   setState((prev) => ({
    //     ...prev,
    //     error: error.message,
    //     isLoading: false,
    //   }));
    // });

    console.log('[Renderer] WorkspaceProvider setting up listeners');
    // Cleanup listeners on unmount
    return () => {
      // unsubscribeDirectory();
      // unsubscribeImage();
      // unsubscribeError();
    };
  }, [backend]);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
