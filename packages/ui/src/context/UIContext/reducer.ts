import { produce } from 'immer';
import {
  UIContextState,
  FrameData,
  PageData,
  PageLoadingState,
  Vector2,
  MIN_FRAME_SIZE,
  DEFAULT_FRAME_SIZE_RATIO,
  generatePageId,
} from '@workspace/shared';
import { rotateVector } from '../../utils/geometry';

// Action types for reducer
export type Action =
  | { type: 'ADD_FRAME'; payload: Partial<FrameData> & Pick<FrameData, 'x' | 'y' | 'width' | 'height' | 'rotation'> }
  | { type: 'ADD_MAGIC_FRAME'; payload: Omit<FrameData, "id" | "label" | "orientation" | "pageId"> }
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
  | { type: 'UPDATE_PAGE'; updates: Partial<PageData>; imagePath: string }
  | { type: 'SET_PAGE_LOADING_STATE'; state: PageLoadingState };

// Validate frame bounds - only x,y coordinates must stay within page
export const isFrameWithinBounds = (frame: Partial<FrameData>, page: PageData): boolean => {
  if (frame.x !== undefined && (frame.x < 0 || frame.x > page.width)) return false;
  if (frame.y !== undefined && (frame.y < 0 || frame.y > page.height)) return false;
  return true;
};

// Helper to find frame by ID across all pages
const findFrameById = (framesByPage: Record<string, FrameData[]>, frameId: string): { frame: FrameData; pageId: string } | undefined => {
  for (const [pageId, frames] of Object.entries(framesByPage)) {
    const frame = frames.find(f => f.id === frameId);
    if (frame) {
      return { frame, pageId };
    }
  }
  return undefined;
};

// Initial state
export const initialState: UIContextState = {
  currentPage: null,
  currentPageId: null,
  framesByPage: {},
  selectedFrameIds: [],
  nextFrameNumberByPage: {},
  pageLoadingState: 'empty',
};

// Reducer
export const reducer = (
  state: UIContextState,
  action: Action
): UIContextState => {
  switch (action.type) {
    case 'ADD_FRAME': {
      return produce(state, draft => {
        if (!draft.currentPageId || !draft.currentPage) {
          console.error('[UIContext] Cannot add frame without active page');
          return;
        }
        
        const pageId = draft.currentPageId;
        const frameNumber = draft.nextFrameNumberByPage[pageId] || 1;
        
        const id = action.payload.id || `${pageId}-frame-${frameNumber}`;
        const label = action.payload.label || `Frame ${frameNumber}`;
        
        console.log('[UIContext] Adding frame with payload:', action.payload);
        console.log('[UIContext] Payload has imageData:', !!action.payload.imageData);
        
        const defaultSize = {
          width: draft.currentPage.width * DEFAULT_FRAME_SIZE_RATIO,
          height: draft.currentPage.height * DEFAULT_FRAME_SIZE_RATIO
        };
        
        const frame: FrameData = {
          ...defaultSize,
          ...action.payload,
          id,
          label,
          orientation: action.payload.orientation || 0 as const,
          pageId // Always include pageId
        };
        
        console.log('[UIContext] Created frame has imageData:', !!frame.imageData);
        
        // Ensure frame position stays within page bounds
        frame.x = Math.max(0, Math.min(frame.x, draft.currentPage.width));
        frame.y = Math.max(0, Math.min(frame.y, draft.currentPage.height));
        frame.width = Math.max(MIN_FRAME_SIZE, frame.width);
        frame.height = Math.max(MIN_FRAME_SIZE, frame.height);
        
        // Add to page's frame array
        if (!draft.framesByPage[pageId]) {
          draft.framesByPage[pageId] = [];
        }
        draft.framesByPage[pageId].push(frame);
        
        // Increment counter only if we generated the ID
        if (!action.payload.id) {
          draft.nextFrameNumberByPage[pageId] = frameNumber + 1;
        }
      });
    }

    case 'ADD_MAGIC_FRAME': {
      return produce(state, draft => {
        if (!draft.currentPageId || !draft.currentPage) {
          console.error('[UIContext] Cannot add frame without active page');
          return;
        }
        
        const pageId = draft.currentPageId;
        const frameNumber = draft.nextFrameNumberByPage[pageId] || 1;
        
        const id = `${pageId}-frame-${frameNumber}`;
        const defaultSize = {
          width: draft.currentPage.width * DEFAULT_FRAME_SIZE_RATIO,
          height: draft.currentPage.height * DEFAULT_FRAME_SIZE_RATIO
        };
        
        const frame: FrameData = {
          ...defaultSize,
          ...action.payload,
          id,
          label: `Magic Frame ${frameNumber}`,
          orientation: 0 as const,
          pageId
        };
        
        frame.x = Math.max(0, Math.min(frame.x, draft.currentPage.width));
        frame.y = Math.max(0, Math.min(frame.y, draft.currentPage.height));
        frame.width = Math.max(MIN_FRAME_SIZE, frame.width);
        frame.height = Math.max(MIN_FRAME_SIZE, frame.height);
        
        if (!draft.framesByPage[pageId]) {
          draft.framesByPage[pageId] = [];
        }
        draft.framesByPage[pageId].push(frame);
        draft.nextFrameNumberByPage[pageId] = frameNumber + 1;
      });
    }
      
    case 'UPDATE_FRAME': {
      return produce(state, draft => {
        // Find frame across all pages
        for (const [pageId, frames] of Object.entries(draft.framesByPage)) {
          const frameIndex = frames.findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            const frame = frames[frameIndex];
            
            // Filter out undefined values from updates
            const filteredUpdates = Object.entries(action.updates).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                (acc as any)[key] = value;
              }
              return acc;
            }, {} as Partial<FrameData>);
            
            const updatedFrame = { ...frame, ...filteredUpdates };
            
            // Enforce minimum dimensions
            if (updatedFrame.width < MIN_FRAME_SIZE) updatedFrame.width = MIN_FRAME_SIZE;
            if (updatedFrame.height < MIN_FRAME_SIZE) updatedFrame.height = MIN_FRAME_SIZE;
            
            // Validate bounds if we have current page
            if (draft.currentPage) {
              updatedFrame.x = Math.max(0, Math.min(updatedFrame.x, draft.currentPage.width));
              updatedFrame.y = Math.max(0, Math.min(updatedFrame.y, draft.currentPage.height));
            }
            
            frames[frameIndex] = updatedFrame;
            break;
          }
        }
      });
    }

    case 'REMOVE_FRAME': {
      return produce(state, draft => {
        // Remove from the appropriate page's frame array
        for (const [pageId, frames] of Object.entries(draft.framesByPage)) {
          const frameIndex = frames.findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            frames.splice(frameIndex, 1);
            break;
          }
        }
        
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => id !== action.id);
      });
    }

    case 'REMOVE_FRAMES_BATCH': {
      return produce(state, draft => {
        action.ids.forEach(frameId => {
          // Find and remove each frame
          for (const [pageId, frames] of Object.entries(draft.framesByPage)) {
            const frameIndex = frames.findIndex(f => f.id === frameId);
            if (frameIndex !== -1) {
              frames.splice(frameIndex, 1);
              break;
            }
          }
        });
        
        // Remove from selection
        draft.selectedFrameIds = draft.selectedFrameIds.filter(id => !action.ids.includes(id));
      });
    }

    case 'RENAME_FRAME': {
      return produce(state, draft => {
        const result = findFrameById(draft.framesByPage, action.id);
        if (result) {
          const frameIndex = draft.framesByPage[result.pageId].findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            draft.framesByPage[result.pageId][frameIndex].label = action.label;
          }
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
        const result = findFrameById(draft.framesByPage, action.id);
        if (result) {
          const frameIndex = draft.framesByPage[result.pageId].findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            draft.framesByPage[result.pageId][frameIndex].orientation = action.orientation;
          }
        }
      });
    }

    case 'TRANSLATE_FRAME_RELATIVE': {
      return produce(state, draft => {
        const result = findFrameById(draft.framesByPage, action.id);
        if (result && draft.currentPage) {
          const frameIndex = draft.framesByPage[result.pageId].findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            const frame = draft.framesByPage[result.pageId][frameIndex];
            const rotated = rotateVector(action.vector, frame.rotation);
            
            const newX = frame.x + rotated.x;
            const newY = frame.y + rotated.y;
            
            // Clamp to page bounds
            frame.x = Math.max(0, Math.min(newX, draft.currentPage.width));
            frame.y = Math.max(0, Math.min(newY, draft.currentPage.height));
          }
        }
      });
    }

    case 'ROTATE_FRAME': {
      return produce(state, draft => {
        const result = findFrameById(draft.framesByPage, action.id);
        if (result) {
          const frameIndex = draft.framesByPage[result.pageId].findIndex(f => f.id === action.id);
          if (frameIndex !== -1) {
            draft.framesByPage[result.pageId][frameIndex].rotation += action.dAngle;
          }
        }
      });
    }

    case 'SAVE_FRAMES':
      // Just log for now as specified
      console.log('Saving frames:', action.ids);
      return state;

    case 'UPDATE_PAGE': {
      return produce(state, draft => {
        if (!action.imagePath) {
          console.error('[UIContext] Cannot update page without image path');
          return;
        }
        
        // Generate consistent page ID from path
        const pageId = generatePageId(action.imagePath);
        
        // Create/update page
        draft.currentPage = {
          ...draft.currentPage,
          ...action.updates,
          id: pageId,
          imagePath: action.imagePath
        } as PageData;
        
        draft.currentPageId = pageId;
        
        // Initialize frame array for new pages
        if (!draft.framesByPage[pageId]) {
          draft.framesByPage[pageId] = [];
          draft.nextFrameNumberByPage[pageId] = 1;
        }
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