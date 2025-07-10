import { produce } from 'immer';
import {
  UIContextState,
  UIContextSnapshot,
  FrameData,
  PageData,
  PageLoadingState,
  Vector2,
  MIN_FRAME_SIZE,
  DEFAULT_FRAME_SIZE_RATIO,
} from '@workspace/shared';
import { rotateVector } from '../../utils/geometry';

// Action types for reducer
export type Action =
  | { type: 'ADD_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation"> }
  | { type: 'ADD_MAGIC_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation"> }
  | { type: 'UPDATE_FRAME'; id: string; updates: Partial<FrameData> }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'REMOVE_FRAMES_BATCH'; ids: string[] }
  | { type: 'RENAME_FRAME'; id: string; label: string }
  | { type: 'SELECT_FRAME'; id: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ORIENTATION'; id: string; orientation: 0 | 90 | 180 | 270 }
  | { type: 'TRANSLATE_FRAME_RELATIVE'; id: string; vector: Vector2 }
  | { type: 'ROTATE_FRAME'; id: string; dAngle: number }
  | { type: 'SAVE_FRAMES'; ids: string[] }
  | { type: 'UPDATE_PAGE'; updates: Partial<PageData> }
  | { type: 'SET_PAGE_LOADING_STATE'; state: PageLoadingState };

// Generate sequential frame ID
let frameCounter = 0;
export const generateId = () => {
  return `frame-${++frameCounter}`;
};

// Validate frame bounds - only x,y coordinates must stay within page
export const isFrameWithinBounds = (frame: Partial<FrameData>, page: PageData): boolean => {
  if (frame.x !== undefined && (frame.x < 0 || frame.x > page.width)) return false;
  if (frame.y !== undefined && (frame.y < 0 || frame.y > page.height)) return false;
  return true;
};

// Create a snapshot of the current state
export const createSnapshot = (state: UIContextState): UIContextSnapshot => ({
  page: state.page,
  frames: state.frames,
  selectedFrameIds: state.selectedFrameIds,
  nextFrameNumber: state.nextFrameNumber
});

// Initial state
export const initialState: UIContextState = {
  page: {
    id: 'page-1',
    width: 800,
    height: 600,
    imageData: ''
  },
  frames: {},
  selectedFrameIds: [],
  nextFrameNumber: 1,
  pageLoadingState: 'empty'
};

// Reducer
export const reducer = (state: UIContextState, action: Action): UIContextState => {
  switch (action.type) {
    case 'ADD_FRAME': {
      return produce(state, draft => {
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
    }

    case 'ADD_MAGIC_FRAME': {
      // Same as ADD_FRAME but with "Magic" prefix
      return produce(state, draft => {
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
    }
      
    case 'UPDATE_FRAME': {
      return produce(state, draft => {
        if (draft.frames[action.id]) {
          const currentFrame = draft.frames[action.id];
          
          // Filter out undefined values from updates to prevent overwriting existing values
          const filteredUpdates = Object.entries(action.updates).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              (acc as any)[key] = value;
            }
            return acc;
          }, {} as Partial<FrameData>);
          
          const updatedFrame = { ...currentFrame, ...filteredUpdates };
          
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
    }

    case 'REMOVE_FRAME': {
      return produce(state, draft => {
        delete draft.frames[action.id];
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => id !== action.id);
      });
    }

    case 'REMOVE_FRAMES_BATCH': {
      return produce(state, draft => {
        action.ids.forEach(id => {
          delete draft.frames[id];
        });
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => !action.ids.includes(id));
      });
    }

    case 'RENAME_FRAME': {
      return produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].label = action.label;
        }
      });
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

    case 'SET_ORIENTATION': {
      return produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].orientation = action.orientation;
        }
      });
    }

    case 'TRANSLATE_FRAME_RELATIVE': {
      const frame = state.frames[action.id];
      if (!frame) return state;
      
      const rotated = rotateVector(action.vector, frame.rotation);
      
      return produce(state, draft => {
        const draftFrame = draft.frames[action.id];
        if (draftFrame) {
          const newX = draftFrame.x + rotated.x;
          const newY = draftFrame.y + rotated.y;
          
          // Clamp to page bounds
          draftFrame.x = Math.max(0, Math.min(newX, draft.page.width));
          draftFrame.y = Math.max(0, Math.min(newY, draft.page.height));
        }
      });
    }

    case 'ROTATE_FRAME': {
      return produce(state, draft => {
        if (draft.frames[action.id]) {
          draft.frames[action.id].rotation += action.dAngle;
        }
      });
    }

    case 'SAVE_FRAMES':
      // Just log for now as specified
      console.log('Saving frames:', action.ids);
      return state;

    case 'UPDATE_PAGE': {
      return produce(state, draft => {
        draft.page = { ...draft.page, ...action.updates };
      });
    }

    case 'SET_PAGE_LOADING_STATE': {
      return produce(state, draft => {
        draft.pageLoadingState = action.state;
      });
    }

    default:
      return state;
  }
}; 