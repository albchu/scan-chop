import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useBackend } from './BackendContext';
import { DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';

export const WorkspaceContext = createContext<WorkspaceContextProps | null>(null);

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

interface WorkspaceContextProps {
  state: WorkspaceState;
  loadDirectory: (path: string) => Promise<void>;
  clearError: () => void;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const backend = useBackend();

  const [state, setState] = useState<WorkspaceState>({
    currentDirectory: '',
    imagePaths: [],
    subdirectories: [],
    loadedImages: new Map(),
    isLoading: false,
    error: null,
  });

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
    const unsubscribeDirectory = workspace.onDirectoryReady(
      (payload: DirectoryReadyPayload) => {
        console.log('[Renderer] WorkspaceProvider onDirectoryReady:', payload);
        setState((prev) => ({
          ...prev,
          currentDirectory: payload.path,
          imagePaths: payload.imagePaths,
          subdirectories: payload.subdirectories,
          isLoading: false,
        }));
      }
    );

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

    const unsubscribeError = workspace.onError((error: { message: string }) => {
      console.error('[Renderer] WorkspaceProvider error:', error);
      setState((prev) => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    });

    console.log('[Renderer] WorkspaceProvider setting up listeners');

    // Cleanup listeners on unmount
    return () => {
      unsubscribeDirectory();
      // unsubscribeImage();
      unsubscribeError();
    };
  }, [backend]);

  const loadDirectory = async (path: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    await backend.workspace.loadDirectory(path);
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const value: WorkspaceContextProps = {
    state,
    loadDirectory,
    clearError,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextProps {
  const workspaceProps = useContext(WorkspaceContext);
  if (!workspaceProps) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return workspaceProps;
}
