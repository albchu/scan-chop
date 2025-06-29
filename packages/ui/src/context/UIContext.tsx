import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { produce } from 'immer';
import {
  UIContextState,
  UIContextActions,
  UIContextSnapshot,
  FrameData,
  PageData,
  ToolMode,
  Vector2,
  HistoryEntry,
  MIN_FRAME_SIZE,
  DEFAULT_FRAME_SIZE_RATIO,
  MAX_HISTORY_SIZE
} from '@workspace/shared';
import { rotateVector } from '../utils/geometry';

// Action types for reducer
type Action =
  | { type: 'ADD_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation"> }
  | { type: 'ADD_MAGIC_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation"> }
  | { type: 'UPDATE_FRAME'; id: string; updates: Partial<FrameData>; historyLabel: string }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'REMOVE_FRAMES_BATCH'; ids: string[] }
  | { type: 'RENAME_FRAME'; id: string; label: string }
  | { type: 'SELECT_FRAME'; id: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_MODE'; mode: ToolMode }
  | { type: 'SET_ORIENTATION'; id: string; orientation: 90 | 180 | -90 }
  | { type: 'TRANSLATE_FRAME_RELATIVE'; id: string; vector: Vector2 }
  | { type: 'ROTATE_FRAME'; id: string; dAngle: number }
  | { type: 'SAVE_FRAMES'; ids: string[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// Context type
type UIContextType = UIContextState & UIContextActions;

const UIContext = createContext<UIContextType | null>(null);

// Generate sequential frame ID
let frameCounter = 0;
const generateId = () => {
  return `frame-${++frameCounter}`;
};

// Validate frame bounds - only x,y coordinates must stay within page
const isFrameWithinBounds = (frame: Partial<FrameData>, page: PageData): boolean => {
  if (frame.x !== undefined && (frame.x < 0 || frame.x > page.width)) return false;
  if (frame.y !== undefined && (frame.y < 0 || frame.y > page.height)) return false;
  return true;
};

// Create a snapshot of the current state
const createSnapshot = (state: UIContextState): UIContextSnapshot => ({
  mode: state.mode,
  page: state.page,
  frames: state.frames,
  selectedFrameIds: state.selectedFrameIds,
  nextFrameNumber: state.nextFrameNumber
});

// Push to history stack - takes the PREVIOUS state as snapshot
const pushHistory = (previousState: UIContextState, currentState: UIContextState, label: string): UIContextState => {
  return produce(currentState, draft => {
    const entry: HistoryEntry = {
      snapshot: createSnapshot(previousState),
      label
    };
    
    // Remove oldest if at max capacity
    if (draft.history.undoStack.length >= MAX_HISTORY_SIZE) {
      draft.history.undoStack.shift();
    }
    
    draft.history.undoStack.push(entry);
    draft.history.redoStack = []; // Clear redo stack on new action
  });
};



// Initial state
const initialState: UIContextState = {
  mode: 'select',
  page: {
    id: 'page-1',
    width: 800,
    height: 600,
    imageData: ''
  },
  frames: {},
  selectedFrameIds: [],
  nextFrameNumber: 1,
  history: {
    undoStack: [],
    redoStack: []
  }
};

// Reducer
const reducer = (state: UIContextState, action: Action): UIContextState => {
  let newState = state;
  
  switch (action.type) {
    case 'ADD_FRAME': {
      const modifiedState = produce(state, draft => {
        const id = generateId();
        const defaultSize = {
          width: draft.page.width * DEFAULT_FRAME_SIZE_RATIO,
          height: draft.page.height * DEFAULT_FRAME_SIZE_RATIO
        };
        const frame: FrameData = {
          ...defaultSize,
          ...action.payload,
          id,
          label: `Frame ${draft.nextFrameNumber}`,
          orientation: 0 as const
        };
        // Ensure frame position stays within page bounds
        frame.x = Math.max(0, Math.min(frame.x, draft.page.width));
        frame.y = Math.max(0, Math.min(frame.y, draft.page.height));
        frame.width = Math.max(MIN_FRAME_SIZE, frame.width);
        frame.height = Math.max(MIN_FRAME_SIZE, frame.height);
        
        draft.frames[id] = frame;
        draft.nextFrameNumber++;
      });
      return pushHistory(state, modifiedState, `Add Frame ${state.nextFrameNumber}`);
    }

    case 'ADD_MAGIC_FRAME': {
      // Same as ADD_FRAME but with "Magic" prefix
      const modifiedState = produce(state, draft => {
        const id = generateId();
        const defaultSize = {
          width: draft.page.width * DEFAULT_FRAME_SIZE_RATIO,
          height: draft.page.height * DEFAULT_FRAME_SIZE_RATIO
        };
        const frame: FrameData = {
          ...defaultSize,
          ...action.payload,
          id,
          label: `Magic Frame ${draft.nextFrameNumber}`,
          orientation: 0 as const
        };
        frame.x = Math.max(0, Math.min(frame.x, draft.page.width));
        frame.y = Math.max(0, Math.min(frame.y, draft.page.height));
        frame.width = Math.max(MIN_FRAME_SIZE, frame.width);
        frame.height = Math.max(MIN_FRAME_SIZE, frame.height);
        
        draft.frames[id] = frame;
        draft.nextFrameNumber++;
      });
      return pushHistory(state, modifiedState, `Add Magic Frame ${state.nextFrameNumber}`);
    }
      
    case 'UPDATE_FRAME': {
      const modifiedState = produce(state, draft => {
        if (draft.frames[action.id]) {
          const currentFrame = draft.frames[action.id];
          const updatedFrame = { ...currentFrame, ...action.updates };
          
          // Enforce minimum dimensions
          if (updatedFrame.width < MIN_FRAME_SIZE) updatedFrame.width = MIN_FRAME_SIZE;
          if (updatedFrame.height < MIN_FRAME_SIZE) updatedFrame.height = MIN_FRAME_SIZE;
          
          // Validate frame position stays within bounds (width/height can exceed)
          if (!isFrameWithinBounds(updatedFrame, draft.page)) {
            // Clamp position to bounds
            updatedFrame.x = Math.max(0, Math.min(updatedFrame.x, draft.page.width));
            updatedFrame.y = Math.max(0, Math.min(updatedFrame.y, draft.page.height));
          }
          
          draft.frames[action.id] = updatedFrame;
        }
      });
      if (modifiedState !== state) {
        return pushHistory(state, modifiedState, action.historyLabel);
      }
      return state;
    }

    case 'REMOVE_FRAME': {
      const frameLabel = state.frames[action.id]?.label || 'Frame';
      const modifiedState = produce(state, draft => {
        delete draft.frames[action.id];
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => id !== action.id);
      });
      return pushHistory(state, modifiedState, `Remove ${frameLabel}`);
    }

    case 'REMOVE_FRAMES_BATCH': {
      const frameCount = action.ids.length;
      const modifiedState = produce(state, draft => {
        action.ids.forEach(id => {
          delete draft.frames[id];
        });
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => !action.ids.includes(id));
      });
      return pushHistory(state, modifiedState, `Remove ${frameCount} frames`);
    }

    case 'RENAME_FRAME': {
      const oldLabel = state.frames[action.id]?.label || 'Frame';
      const modifiedState = produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].label = action.label;
        }
      });
      return pushHistory(state, modifiedState, `Rename ${oldLabel} to ${action.label}`);
    }

    case 'SELECT_FRAME':
      return produce(state, draft => {
        const frameIndex = draft.selectedFrameIds.indexOf(action.id);
        if (frameIndex === -1) {
          draft.selectedFrameIds.push(action.id);
        } else {
          draft.selectedFrameIds.splice(frameIndex, 1);
        }
      });

    case 'CLEAR_SELECTION':
      return produce(state, draft => {
        draft.selectedFrameIds = [];
      });

    case 'SET_MODE':
      return produce(state, draft => {
        draft.mode = action.mode;
        // Clear selection when switching tools
        draft.selectedFrameIds = [];
      });

    case 'SET_ORIENTATION': {
      const frameLabel = state.frames[action.id]?.label || 'Frame';
      const modifiedState = produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].orientation = action.orientation;
        }
      });
      return pushHistory(state, modifiedState, `Change Orientation ${frameLabel}`);
    }

    case 'TRANSLATE_FRAME_RELATIVE': {
      const frame = state.frames[action.id];
      if (!frame) return state;
      
      const frameLabel = frame.label;
      const rotated = rotateVector(action.vector, frame.rotation);
      
      const modifiedState = produce(state, draft => {
        const draftFrame = draft.frames[action.id];
        if (draftFrame) {
          const newX = draftFrame.x + rotated.x;
          const newY = draftFrame.y + rotated.y;
          
          // Clamp to page bounds
          draftFrame.x = Math.max(0, Math.min(newX, draft.page.width));
          draftFrame.y = Math.max(0, Math.min(newY, draft.page.height));
        }
      });
      
      if (modifiedState !== state) {
        return pushHistory(state, modifiedState, `Move ${frameLabel}`);
      }
      return state;
    }

    case 'ROTATE_FRAME': {
      const frameLabel = state.frames[action.id]?.label || 'Frame';
      const modifiedState = produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].rotation += action.dAngle;
        }
      });
      return pushHistory(state, modifiedState, `Rotate ${frameLabel}`);
    }

    case 'SAVE_FRAMES':
      // Just log for now as specified
      console.log('Saving frames:', action.ids);
      return state;

    case 'UNDO': {
      if (state.history.undoStack.length === 0) return state;
      
      return produce(state, draft => {
        const entry = draft.history.undoStack.pop()!;
        draft.history.redoStack.push({
          snapshot: createSnapshot(state),
          label: `Undo ${entry.label}`
        });
        
        // Restore the snapshot directly
        draft.mode = entry.snapshot.mode;
        draft.page = entry.snapshot.page;
        draft.frames = entry.snapshot.frames;
        draft.selectedFrameIds = entry.snapshot.selectedFrameIds;
        draft.nextFrameNumber = entry.snapshot.nextFrameNumber;
      });
    }

    case 'REDO': {
      if (state.history.redoStack.length === 0) return state;
      
      return produce(state, draft => {
        const entry = draft.history.redoStack.pop()!;
        draft.history.undoStack.push({
          snapshot: createSnapshot(state),
          label: `Redo ${entry.label}`
        });
        
        // Restore the snapshot directly
        draft.mode = entry.snapshot.mode;
        draft.page = entry.snapshot.page;
        draft.frames = entry.snapshot.frames;
        draft.selectedFrameIds = entry.snapshot.selectedFrameIds;
        draft.nextFrameNumber = entry.snapshot.nextFrameNumber;
      });
    }
  }
  
  return newState;
};

// Provider component
export const UIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Action creators
  const setMode = useCallback((mode: ToolMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const addFrame = useCallback((frame: Omit<FrameData, "id" | "label" | "orientation">) => {
    dispatch({ type: 'ADD_FRAME', payload: frame });
  }, []);

  const addMagicFrame = useCallback((frame: Omit<FrameData, "id" | "label" | "orientation">) => {
    dispatch({ type: 'ADD_MAGIC_FRAME', payload: frame });
  }, []);

  const removeFrame = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FRAME', id });
  }, []);

  const removeFramesBatch = useCallback((ids: string[]) => {
    dispatch({ type: 'REMOVE_FRAMES_BATCH', ids });
  }, []);

  const updateFrame = useCallback((id: string, updates: Partial<FrameData>) => {
    const frame = state.frames[id];
    const historyLabel = 
      updates.x !== undefined || updates.y !== undefined ? `Move ${frame?.label || 'Frame'}` :
      updates.width !== undefined || updates.height !== undefined ? `Resize ${frame?.label || 'Frame'}` :
      updates.rotation !== undefined ? `Rotate ${frame?.label || 'Frame'}` :
      `Update ${frame?.label || 'Frame'}`;
    
    dispatch({ type: 'UPDATE_FRAME', id, updates, historyLabel });
  }, [state.frames]);

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

  const setOrientation = useCallback((id: string, orientation: 90 | 180 | -90) => {
    dispatch({ type: 'SET_ORIENTATION', id, orientation });
  }, []);

  const saveFrames = useCallback((ids: string[]) => {
    dispatch({ type: 'SAVE_FRAMES', ids });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const value: UIContextType = {
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
    redo
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

// Hook to use the context
export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIContextProvider');
  }
  return context;
}; 