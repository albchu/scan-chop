/**
 * Compatibility layer for gradual migration from UIContext to Zustand
 * This allows components to continue using useUIContext() while we migrate to Zustand
 */
import { useUIStore } from './uiStore';
import type { UIContextType } from '../context/UIContext/UIContextProvider';

/**
 * Compatibility hook that mimics the old useUIContext interface
 * but uses Zustand store under the hood
 */
export const useUIContextCompat = (): UIContextType => {
  // Get all state and actions from Zustand store
  const store = useUIStore();
  
  // Return object matching the old UIContextType interface
  return {
    // State
    currentPage: store.currentPage,
    currentPageId: store.currentPageId,
    framesByPage: store.framesByPage,
    selectedFrameIds: store.selectedFrameIds,
    nextFrameNumberByPage: store.nextFrameNumberByPage,
    pageLoadingState: store.pageLoadingState,
    
    // Computed
    currentPageFrames: store.getCurrentPageFrames(),
    
    // Actions
    findFrameById: store.findFrameById,
    addFrame: store.addFrame,
    addMagicFrame: store.addMagicFrame,
    removeFrame: store.removeFrame,
    removeFramesBatch: store.removeFramesBatch,
    updateFrame: store.updateFrame,
    renameFrame: store.renameFrame,
    selectFrame: store.selectFrame,
    clearSelection: store.clearSelection,
    translateFrameRelative: store.translateFrameRelative,
    rotateFrame: store.rotateFrame,
    setOrientation: store.setOrientation,
    saveFrames: store.saveFrames,
    updatePage: store.updatePage,
    setPageLoadingState: store.setPageLoadingState,
  };
};

/**
 * Provider component for compatibility
 * This is a no-op since Zustand doesn't need providers
 * but allows existing code to keep using UIContextProvider
 */
export const UIContextProviderCompat: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
}; 