// import { useState, useEffect, useCallback } from 'react';
// import { DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';
// import { useBackend } from './useBackend';



// export function useWorkspace(): UseWorkspaceReturn {
//   const backend = useBackend();
//   const [state, setState] = useState<WorkspaceState>({
//     currentDirectory: null,
//     imagePaths: [],
//     subdirectories: [],
//     loadedImages: new Map(),
//     isLoading: false,
//     error: null,
//   });

//   // Load the workspace once 
//   // useEffect(() => {
//   //   cons
//   // }, []);

//   // useEffect(() => {
//   //   // Backend should always have workspace API now
//   //   if (!backend || !backend.workspace) {
//   //     console.error('Backend or workspace API not available', backend);
//   //     return;
//   //   }

//   //   const { workspace } = backend;

//   //   // Set up listeners for workspace events
//   //   const unsubscribeDirectory = workspace.onDirectoryReady((payload: DirectoryReadyPayload) => {
//   //     setState(prev => ({
//   //       ...prev,
//   //       currentDirectory: payload.path,
//   //       imagePaths: payload.imagePaths,
//   //       subdirectories: payload.subdirectories,
//   //       isLoading: false,
//   //     }));
//   //   });

//   //   const unsubscribeImage = workspace.onImageReady((payload: ImageReadyPayload) => {
//   //     setState(prev => ({
//   //       ...prev,
//   //       loadedImages: new Map(prev.loadedImages).set(payload.path, {
//   //         path: payload.path,
//   //         width: payload.width,
//   //         height: payload.height,
//   //         dataUrl: payload.dataUrl,
//   //       }),
//   //     }));
//   //   });

//   //   const unsubscribeError = workspace.onError((error: { message: string }) => {
//   //     setState(prev => ({
//   //       ...prev,
//   //       error: error.message,
//   //       isLoading: false,
//   //     }));
//   //   });

//   //   // Cleanup listeners on unmount
//   //   return () => {
//   //     unsubscribeDirectory();
//   //     unsubscribeImage();
//   //     unsubscribeError();
//   //   };
//   // }, [backend]);

//   const loadDirectory = useCallback(async (path: string) => {
//     if (!backend || !backend.workspace) {
//       setState(prev => ({
//         ...prev,
//         error: 'Workspace API not available',
//       }));
//       return;
//     }

//     setState(prev => ({
//       ...prev,
//       isLoading: true,
//       error: null,
//       loadedImages: new Map(), // Clear previous images
//     }));

//     try {
//       await backend.workspace.loadDirectory(path);
//     } catch (error) {
//       setState(prev => ({
//         ...prev,
//         error: error instanceof Error ? error.message : 'Failed to load directory',
//         isLoading: false,
//       }));
//     }
//   }, [backend]);

//   const clearError = useCallback(() => {
//     setState(prev => ({ ...prev, error: null }));
//   }, []);

//   return {
//     state,
//     loadDirectory,
//     clearError,
//   };
// } 