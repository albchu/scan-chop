import React, {
  useReducer,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  UIContextState,
  UIContextActions,
  FrameData,
  Vector2,
} from '@workspace/shared';
import { reducer, initialState } from './reducer';

export type UIContextType = UIContextState & UIContextActions;
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

  // Action creators
  const addFrame = useCallback(
    (frame: Omit<FrameData, 'id' | 'label' | 'orientation'>) => {
      dispatch({ type: 'ADD_FRAME', payload: frame });
    },
    []
  );

  const addMagicFrame = useCallback(
    (frame: Omit<FrameData, 'id' | 'label' | 'orientation'>) => {
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

  const value: UIContextState & UIContextActions = {
    ...state,
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
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
