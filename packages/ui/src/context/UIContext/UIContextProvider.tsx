import React, {
  useReducer,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import {
  UIContextState,
  UIContextActions,
  FrameData,
  Vector2,
  PageData,
  PageLoadingState,
} from '@workspace/shared';
import { reducer, initialState } from './reducer';

export type UIContextType = UIContextState & UIContextActions & {
  currentPageFrames: FrameData[];
  findFrameById: (frameId: string) => FrameData | undefined;
};

export const UIContext = createContext<UIContextType | null>(null);

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIContextProvider');
  }
  return context;
};

export const UIContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Computed current page frames
  const currentPageFrames = useMemo(() => {
    if (!state.currentPageId || !state.framesByPage[state.currentPageId]) {
      return [];
    }
    return state.framesByPage[state.currentPageId];
  }, [state.currentPageId, state.framesByPage]);

  // Helper to find frame by ID
  const findFrameById = useCallback((frameId: string): FrameData | undefined => {
    for (const frames of Object.values(state.framesByPage)) {
      const frame = frames.find(f => f.id === frameId);
      if (frame) return frame;
    }
    return undefined;
  }, [state.framesByPage]);

  // Action creators
  const addFrame = useCallback(
    (frame: Partial<FrameData> & Pick<FrameData, 'x' | 'y' | 'width' | 'height' | 'rotation'>) => {
      dispatch({ type: 'ADD_FRAME', payload: frame });
    },
    []
  );

  const addMagicFrame = useCallback(
    (frame: Omit<FrameData, 'id' | 'label' | 'orientation' | 'pageId'>) => {
      dispatch({ type: 'ADD_MAGIC_FRAME', payload: frame });
    },
    []
  );

  const removeFrame = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FRAME', id });
  }, []);

  const removeFramesBatch = useCallback((ids: string[]) => {
    dispatch({ type: 'REMOVE_FRAMES_BATCH', ids });
  }, []);

  const updateFrame = useCallback(
    (id: string, updates: Partial<FrameData>) => {
      dispatch({ type: 'UPDATE_FRAME', id, updates });
    },
    []
  );

  const renameFrame = useCallback((id: string, label: string) => {
    dispatch({ type: 'RENAME_FRAME', id, label });
  }, []);

  const selectFrame = useCallback((id: string) => {
    dispatch({ type: 'SELECT_FRAME', id });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const translateFrameRelative = useCallback((id: string, vector: Vector2) => {
    dispatch({ type: 'TRANSLATE_FRAME_RELATIVE', id, vector });
  }, []);

  const rotateFrame = useCallback((id: string, dAngle: number) => {
    dispatch({ type: 'ROTATE_FRAME', id, dAngle });
  }, []);

  const setOrientation = useCallback(
    (id: string, orientation: 0 | 90 | 180 | 270) => {
      dispatch({ type: 'SET_ORIENTATION', id, orientation });
    },
    []
  );

  const saveFrames = useCallback((ids: string[]) => {
    dispatch({ type: 'SAVE_FRAMES', ids });
  }, []);

  const updatePage = useCallback((updates: Partial<PageData>, imagePath: string) => {
    dispatch({ type: 'UPDATE_PAGE', updates, imagePath });
  }, []);

  const setPageLoadingState = useCallback(
    (state: PageLoadingState) => {
      dispatch({ type: 'SET_PAGE_LOADING_STATE', state });
    },
    []
  );

  const value: UIContextType = {
    ...state,
    currentPageFrames,
    findFrameById,
    addFrame,
    addMagicFrame,
    removeFrame,
    removeFramesBatch,
    updateFrame,
    renameFrame,
    selectFrame,
    clearSelection,
    translateFrameRelative,
    rotateFrame,
    setOrientation,
    saveFrames,
    updatePage,
    setPageLoadingState,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
