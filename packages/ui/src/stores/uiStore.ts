import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer';
import { 
  MIN_FRAME_SIZE,
  DEFAULT_FRAME_SIZE_RATIO,
  generatePageId
} from '@workspace/shared';
import type { 
  UIContextState, 
  FrameData, 
  PageData, 
  Vector2, 
  PageLoadingState
} from '@workspace/shared';
import { rotateVector } from '../utils/geometry';

interface UIState extends UIContextState {
  // Actions
  addFrame: (frame: Partial<FrameData> & Pick<FrameData, 'x' | 'y' | 'width' | 'height' | 'rotation'>) => void;
  addMagicFrame: (frame: Omit<FrameData, 'id' | 'label' | 'orientation' | 'pageId'>) => void;
  removeFrame: (id: string) => void;
  removeFramesBatch: (ids: string[]) => void;
  updateFrame: (id: string, updates: Partial<FrameData>) => void;
  renameFrame: (id: string, label: string) => void;
  selectFrame: (id: string) => void;
  clearSelection: () => void;
  translateFrameRelative: (id: string, vector: Vector2) => void;
  rotateFrame: (id: string, dAngle: number) => void;
  setOrientation: (id: string, orientation: 0 | 90 | 180 | 270) => void;
  saveFrames: (ids: string[]) => void;
  updatePage: (updates: Partial<PageData>, imagePath: string) => void;
  setPageLoadingState: (state: PageLoadingState) => void;
  
  // Computed getters
  getCurrentPageFrames: () => FrameData[];
  findFrameById: (id: string) => FrameData | undefined;
}

// Helper to find frame by ID across all pages
const findFrameByIdHelper = (framesByPage: Record<string, FrameData[]>, frameId: string): { frame: FrameData; pageId: string } | undefined => {
  for (const [pageId, frames] of Object.entries(framesByPage)) {
    const frame = frames.find(f => f.id === frameId);
    if (frame) {
      return { frame, pageId };
    }
  }
  return undefined;
};

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentPage: null,
      currentPageId: null,
      framesByPage: {},
      selectedFrameIds: [],
      nextFrameNumberByPage: {},
      pageLoadingState: 'empty',
      
      // Actions
      addFrame: (frame) => set((state) => {
        if (!state.currentPageId || !state.currentPage) {
          console.error('[UIStore] Cannot add frame without active page');
          return;
        }
        
        const pageId = state.currentPageId;
        const frameNumber = state.nextFrameNumberByPage[pageId] || 1;
        
        const id = frame.id || `${pageId}-frame-${frameNumber}`;
        const label = frame.label || `Frame ${frameNumber}`;
        
        console.log('[UIStore] Adding frame with payload:', frame);
        console.log('[UIStore] Payload has imageData:', !!frame.imageData);
        
        const defaultSize = {
          width: state.currentPage.width * DEFAULT_FRAME_SIZE_RATIO,
          height: state.currentPage.height * DEFAULT_FRAME_SIZE_RATIO
        };
        
        const newFrame: FrameData = {
          ...defaultSize,
          ...frame,
          id,
          label,
          orientation: frame.orientation || 0,
          pageId
        };
        
        console.log('[UIStore] Created frame has imageData:', !!newFrame.imageData);
        
        // Ensure frame position stays within page bounds
        newFrame.x = Math.max(0, Math.min(newFrame.x, state.currentPage.width));
        newFrame.y = Math.max(0, Math.min(newFrame.y, state.currentPage.height));
        newFrame.width = Math.max(MIN_FRAME_SIZE, newFrame.width);
        newFrame.height = Math.max(MIN_FRAME_SIZE, newFrame.height);
        
        // Add to page's frame array
        if (!state.framesByPage[pageId]) {
          state.framesByPage[pageId] = [];
        }
        state.framesByPage[pageId].push(newFrame);
        
        // Increment counter only if we generated the ID
        if (!frame.id) {
          state.nextFrameNumberByPage[pageId] = frameNumber + 1;
        }
      }),
      
      addMagicFrame: (frame) => set((state) => {
        if (!state.currentPageId || !state.currentPage) {
          console.error('[UIStore] Cannot add frame without active page');
          return;
        }
        
        const pageId = state.currentPageId;
        const frameNumber = state.nextFrameNumberByPage[pageId] || 1;
        
        const id = `${pageId}-frame-${frameNumber}`;
        const defaultSize = {
          width: state.currentPage.width * DEFAULT_FRAME_SIZE_RATIO,
          height: state.currentPage.height * DEFAULT_FRAME_SIZE_RATIO
        };
        
        const newFrame: FrameData = {
          ...defaultSize,
          ...frame,
          id,
          label: `Magic Frame ${frameNumber}`,
          orientation: 0,
          pageId
        };
        
        newFrame.x = Math.max(0, Math.min(newFrame.x, state.currentPage.width));
        newFrame.y = Math.max(0, Math.min(newFrame.y, state.currentPage.height));
        newFrame.width = Math.max(MIN_FRAME_SIZE, newFrame.width);
        newFrame.height = Math.max(MIN_FRAME_SIZE, newFrame.height);
        
        if (!state.framesByPage[pageId]) {
          state.framesByPage[pageId] = [];
        }
        state.framesByPage[pageId].push(newFrame);
        state.nextFrameNumberByPage[pageId] = frameNumber + 1;
      }),
      
      updateFrame: (id, updates) => set((state) => {
        // Find frame across all pages
        for (const [pageId, frames] of Object.entries(state.framesByPage)) {
          const frameIndex = frames.findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            const frame = frames[frameIndex];
            
            // Filter out undefined values from updates
            const filteredUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                (acc as any)[key] = value;
              }
              return acc;
            }, {} as Partial<FrameData>);
            
            // Apply updates
            Object.assign(frame, filteredUpdates);
            
            // Enforce minimum dimensions
            if (frame.width < MIN_FRAME_SIZE) frame.width = MIN_FRAME_SIZE;
            if (frame.height < MIN_FRAME_SIZE) frame.height = MIN_FRAME_SIZE;
            
            // Validate bounds if we have current page
            if (state.currentPage) {
              frame.x = Math.max(0, Math.min(frame.x, state.currentPage.width));
              frame.y = Math.max(0, Math.min(frame.y, state.currentPage.height));
            }
            
            break;
          }
        }
      }),
      
      removeFrame: (id) => set((state) => {
        // Remove from the appropriate page's frame array
        for (const [pageId, frames] of Object.entries(state.framesByPage)) {
          const frameIndex = frames.findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            frames.splice(frameIndex, 1);
            break;
          }
        }
        
        // Remove from selection
        state.selectedFrameIds = state.selectedFrameIds.filter(frameId => frameId !== id);
      }),
      
      removeFramesBatch: (ids) => set((state) => {
        ids.forEach(frameId => {
          // Find and remove each frame
          for (const [pageId, frames] of Object.entries(state.framesByPage)) {
            const frameIndex = frames.findIndex(f => f.id === frameId);
            if (frameIndex !== -1) {
              frames.splice(frameIndex, 1);
              break;
            }
          }
        });
        
        // Remove from selection
        state.selectedFrameIds = state.selectedFrameIds.filter(id => !ids.includes(id));
      }),
      
      renameFrame: (id, label) => set((state) => {
        const result = findFrameByIdHelper(state.framesByPage, id);
        if (result) {
          const frameIndex = state.framesByPage[result.pageId].findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            state.framesByPage[result.pageId][frameIndex].label = label;
          }
        }
      }),
      
      selectFrame: (id) => set((state) => {
        const index = state.selectedFrameIds.indexOf(id);
        if (index === -1) {
          state.selectedFrameIds.push(id);
        } else {
          state.selectedFrameIds.splice(index, 1);
        }
      }),
      
      clearSelection: () => set((state) => {
        state.selectedFrameIds = [];
      }),
      
      translateFrameRelative: (id, vector) => set((state) => {
        const result = findFrameByIdHelper(state.framesByPage, id);
        if (result && state.currentPage) {
          const frameIndex = state.framesByPage[result.pageId].findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            const frame = state.framesByPage[result.pageId][frameIndex];
            const rotated = rotateVector(vector, frame.rotation);
            
            const newX = frame.x + rotated.x;
            const newY = frame.y + rotated.y;
            
            // Clamp to page bounds
            frame.x = Math.max(0, Math.min(newX, state.currentPage.width));
            frame.y = Math.max(0, Math.min(newY, state.currentPage.height));
          }
        }
      }),
      
      rotateFrame: (id, dAngle) => set((state) => {
        const result = findFrameByIdHelper(state.framesByPage, id);
        if (result) {
          const frameIndex = state.framesByPage[result.pageId].findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            state.framesByPage[result.pageId][frameIndex].rotation += dAngle;
          }
        }
      }),
      
      setOrientation: (id, orientation) => set((state) => {
        const result = findFrameByIdHelper(state.framesByPage, id);
        if (result) {
          const frameIndex = state.framesByPage[result.pageId].findIndex(f => f.id === id);
          if (frameIndex !== -1) {
            state.framesByPage[result.pageId][frameIndex].orientation = orientation;
          }
        }
      }),
      
      saveFrames: (ids) => {
        // Just log for now as specified
        console.log('Saving frames:', ids);
      },
      
      updatePage: (updates, imagePath) => set((state) => {
        if (!imagePath) {
          console.error('[UIStore] Cannot update page without image path');
          return;
        }
        
        // Generate consistent page ID from path
        const pageId = generatePageId(imagePath);
        
        // Create/update page
        state.currentPage = {
          ...state.currentPage,
          ...updates,
          id: pageId,
          imagePath
        } as PageData;
        
        state.currentPageId = pageId;
        
        // Initialize frame array for new pages
        if (!state.framesByPage[pageId]) {
          state.framesByPage[pageId] = [];
          state.nextFrameNumberByPage[pageId] = 1;
        }
      }),
      
      setPageLoadingState: (loadingState) => set((state) => {
        state.pageLoadingState = loadingState;
      }),
      
      // Computed values as functions (not stored in state)
      getCurrentPageFrames: () => {
        const state = get();
        if (!state.currentPageId || !state.framesByPage[state.currentPageId]) {
          return [];
        }
        return state.framesByPage[state.currentPageId];
      },
      
      findFrameById: (frameId) => {
        const state = get();
        for (const frames of Object.values(state.framesByPage)) {
          const frame = frames.find(f => f.id === frameId);
          if (frame) return frame;
        }
        return undefined;
      },
    })),
    {
      name: 'ui-store', // DevTools name
    }
  )
);

// Selectors for common use cases
export const useCurrentPageFrames = () => 
  useUIStore((state) => state.getCurrentPageFrames());

export const useSelectedFrames = () => 
  useUIStore((state) => 
    state.selectedFrameIds
      .map(id => state.findFrameById(id))
      .filter(Boolean) as FrameData[]
  );

export const useFrameById = (id: string) => 
  useUIStore((state) => state.findFrameById(id));

// Granular selectors
export const useFrameCount = () =>
  useUIStore((state) => 
    state.currentPageId 
      ? (state.framesByPage[state.currentPageId]?.length || 0)
      : 0
  );

export const useSelectedCount = () =>
  useUIStore((state) => state.selectedFrameIds.length); 