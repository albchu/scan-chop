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
  ToolMode,
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
  const setMode = useCallback((mode: ToolMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

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
      const frame = state.frames[id];
      const historyLabel =
        updates.x !== undefined || updates.y !== undefined
          ? `Move ${frame?.label || 'Frame'}`
          : updates.width !== undefined || updates.height !== undefined
            ? `Resize ${frame?.label || 'Frame'}`
            : updates.rotation !== undefined
              ? `Rotate ${frame?.label || 'Frame'}`
              : `Update ${frame?.label || 'Frame'}`;

      dispatch({ type: 'UPDATE_FRAME', id, updates, historyLabel });
    },
    [state.frames]
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
    (id: string, orientation: 90 | 180 | -90) => {
      dispatch({ type: 'SET_ORIENTATION', id, orientation });
    },
    []
  );

  const saveFrames = useCallback((ids: string[]) => {
    dispatch({ type: 'SAVE_FRAMES', ids });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const value: UIContextState & UIContextActions = {
    ...state,
    setMode,
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
    undo,
    redo,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
