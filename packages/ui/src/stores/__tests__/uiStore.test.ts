import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../uiStore';
import type { FrameData, PageData } from '@workspace/shared';
import { MIN_FRAME_SIZE, DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

// Suppress console.log/error noise from the store
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockPage: PageData = {
  id: 'page-abc',
  width: 1000,
  height: 800,
  imageData: 'data:image/png;base64,test',
  imagePath: '/test/image.png',
};

const makeFrame = (overrides: Partial<FrameData> = {}): FrameData => ({
  id: 'page-abc-frame-1',
  label: 'Frame 1',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  rotation: 0,
  orientation: 0,
  pageId: 'page-abc',
  imageData: 'data:image/png;base64,frame',
  ...overrides,
});

/** Seed the store with an active page so addFrame etc. can operate */
const seedPage = () => {
  useUIStore.setState({
    currentPage: mockPage,
    currentPageId: 'page-abc',
    framesByPage: { 'page-abc': [] },
    nextFrameNumberByPage: { 'page-abc': 1 },
  });
};

describe('uiStore', () => {
  beforeEach(() => {
    // Merge-reset state fields without wiping action functions
    useUIStore.setState({
      currentPage: null,
      currentPageId: null,
      framesByPage: {},
      selectedFrameIds: [],
      nextFrameNumberByPage: {},
      pageLoadingState: 'empty',
      activeView: 'canvas',
      currentFrameId: null,
      gridColumnWidth: 120,
    });
  });

  // ── addFrame ──────────────────────────────────────────────────────
  describe('addFrame', () => {
    it('auto-generates ID and label when not provided', () => {
      seedPage();
      useUIStore
        .getState()
        .addFrame({ x: 50, y: 50, width: 200, height: 150, rotation: 0 });

      const frames = useUIStore.getState().framesByPage['page-abc'];
      expect(frames).toHaveLength(1);
      expect(frames[0].id).toBe('page-abc-frame-1');
      expect(frames[0].label).toBe('Frame 1');
    });

    it('preserves explicit ID and label', () => {
      seedPage();
      useUIStore.getState().addFrame({
        id: 'custom-id',
        label: 'Custom',
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        rotation: 0,
      });

      const frames = useUIStore.getState().framesByPage['page-abc'];
      expect(frames[0].id).toBe('custom-id');
      expect(frames[0].label).toBe('Custom');
    });

    it('does not increment counter when explicit ID is provided', () => {
      seedPage();
      useUIStore.getState().addFrame({
        id: 'custom-id',
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        rotation: 0,
      });

      // Counter should still be 1 since we provided our own ID
      expect(useUIStore.getState().nextFrameNumberByPage['page-abc']).toBe(1);
    });

    it('increments counter for auto-generated IDs', () => {
      seedPage();
      useUIStore
        .getState()
        .addFrame({ x: 50, y: 50, width: 200, height: 150, rotation: 0 });
      useUIStore
        .getState()
        .addFrame({ x: 60, y: 60, width: 200, height: 150, rotation: 0 });

      const frames = useUIStore.getState().framesByPage['page-abc'];
      expect(frames[0].id).toBe('page-abc-frame-1');
      expect(frames[1].id).toBe('page-abc-frame-2');
      expect(useUIStore.getState().nextFrameNumberByPage['page-abc']).toBe(3);
    });

    it('uses default size from page ratio when width/height not in payload explicitly overridden', () => {
      seedPage();
      // The spread order is: defaultSize, then ...frame, then id/label overrides
      // So if we pass width/height, they override the default
      useUIStore
        .getState()
        .addFrame({ x: 50, y: 50, width: 200, height: 150, rotation: 0 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      // Frame should have the explicitly passed dimensions
      expect(frame.width).toBe(200);
      expect(frame.height).toBe(150);
    });

    it('clamps position to page bounds', () => {
      seedPage();
      useUIStore.getState().addFrame({
        x: -50,
        y: 2000,
        width: 100,
        height: 100,
        rotation: 0,
      });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(0);
      expect(frame.y).toBe(mockPage.height);
    });

    it('enforces MIN_FRAME_SIZE', () => {
      seedPage();
      useUIStore.getState().addFrame({
        x: 50,
        y: 50,
        width: 5,
        height: 5,
        rotation: 0,
      });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.width).toBe(MIN_FRAME_SIZE);
      expect(frame.height).toBe(MIN_FRAME_SIZE);
    });

    it('returns early when no active page', () => {
      // No page seeded
      useUIStore
        .getState()
        .addFrame({ x: 50, y: 50, width: 200, height: 150, rotation: 0 });

      expect(useUIStore.getState().framesByPage).toEqual({});
    });

    it('initializes framesByPage array if missing for the page', () => {
      useUIStore.setState({
        currentPage: mockPage,
        currentPageId: 'page-abc',
        framesByPage: {},
        nextFrameNumberByPage: {},
      });

      useUIStore
        .getState()
        .addFrame({ x: 50, y: 50, width: 200, height: 150, rotation: 0 });

      expect(useUIStore.getState().framesByPage['page-abc']).toHaveLength(1);
    });
  });

  // ── updateFrame ───────────────────────────────────────────────────
  describe('updateFrame', () => {
    it('applies partial updates', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore
        .getState()
        .updateFrame('page-abc-frame-1', { x: 300, label: 'Renamed' });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(300);
      expect(frame.label).toBe('Renamed');
      // Unchanged fields preserved
      expect(frame.y).toBe(100);
    });

    it('filters out undefined values', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame({ label: 'Original' })] },
      });

      useUIStore.getState().updateFrame('page-abc-frame-1', {
        label: undefined,
        x: 50,
      } as Partial<FrameData>);

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.label).toBe('Original');
      expect(frame.x).toBe(50);
    });

    it('enforces minimum dimensions', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore
        .getState()
        .updateFrame('page-abc-frame-1', { width: 2, height: 3 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.width).toBe(MIN_FRAME_SIZE);
      expect(frame.height).toBe(MIN_FRAME_SIZE);
    });

    it('clamps bounds when currentPage is set', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore
        .getState()
        .updateFrame('page-abc-frame-1', { x: -10, y: 9999 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(0);
      expect(frame.y).toBe(mockPage.height);
    });

    it('does not clamp bounds when currentPage is null', () => {
      useUIStore.setState({
        currentPage: null,
        currentPageId: null,
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore
        .getState()
        .updateFrame('page-abc-frame-1', { x: -10, y: 9999 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(-10);
      expect(frame.y).toBe(9999);
    });

    it('is a silent no-op for nonexistent frame', () => {
      seedPage();
      // Should not throw
      useUIStore.getState().updateFrame('nonexistent', { x: 50 });
    });

    it('finds and updates a frame on a non-current page', () => {
      useUIStore.setState({
        currentPage: mockPage,
        currentPageId: 'page-abc',
        framesByPage: {
          'page-abc': [],
          'page-other': [
            makeFrame({ id: 'page-other-frame-1', pageId: 'page-other' }),
          ],
        },
      });

      useUIStore
        .getState()
        .updateFrame('page-other-frame-1', { label: 'Cross-page' });

      const frame = useUIStore.getState().framesByPage['page-other'][0];
      expect(frame.label).toBe('Cross-page');
    });
  });

  // ── removeFrame ───────────────────────────────────────────────────
  describe('removeFrame', () => {
    it('removes frame from page array', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore.getState().removeFrame('page-abc-frame-1');

      expect(useUIStore.getState().framesByPage['page-abc']).toHaveLength(0);
    });

    it('removes from selectedFrameIds', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
        selectedFrameIds: ['page-abc-frame-1', 'other-frame'],
      });

      useUIStore.getState().removeFrame('page-abc-frame-1');

      expect(useUIStore.getState().selectedFrameIds).toEqual(['other-frame']);
    });

    it('clears currentFrameId when deleted frame is current', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
        currentFrameId: 'page-abc-frame-1',
      });

      useUIStore.getState().removeFrame('page-abc-frame-1');

      expect(useUIStore.getState().currentFrameId).toBeNull();
    });

    it('is a silent no-op for nonexistent frame', () => {
      seedPage();
      useUIStore.getState().removeFrame('nonexistent');
      // No throw
    });
  });

  // ── removeFramesBatch ─────────────────────────────────────────────
  describe('removeFramesBatch', () => {
    it('removes multiple frames', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: {
          'page-abc': [
            makeFrame({ id: 'f1' }),
            makeFrame({ id: 'f2' }),
            makeFrame({ id: 'f3' }),
          ],
        },
      });

      useUIStore.getState().removeFramesBatch(['f1', 'f3']);

      const frames = useUIStore.getState().framesByPage['page-abc'];
      expect(frames).toHaveLength(1);
      expect(frames[0].id).toBe('f2');
    });

    it('cleans selectedFrameIds', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: {
          'page-abc': [makeFrame({ id: 'f1' }), makeFrame({ id: 'f2' })],
        },
        selectedFrameIds: ['f1', 'f2'],
      });

      useUIStore.getState().removeFramesBatch(['f1']);

      expect(useUIStore.getState().selectedFrameIds).toEqual(['f2']);
    });

    it('does NOT clear currentFrameId (documenting current behavior)', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame({ id: 'f1' })] },
        currentFrameId: 'f1',
      });

      useUIStore.getState().removeFramesBatch(['f1']);

      // This is inconsistent with removeFrame — documenting as-is
      expect(useUIStore.getState().currentFrameId).toBe('f1');
    });
  });

  // ── renameFrame ───────────────────────────────────────────────────
  describe('renameFrame', () => {
    it('renames an existing frame', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      useUIStore.getState().renameFrame('page-abc-frame-1', 'New Name');

      expect(useUIStore.getState().framesByPage['page-abc'][0].label).toBe(
        'New Name'
      );
    });

    it('is a silent no-op for nonexistent frame', () => {
      seedPage();
      useUIStore.getState().renameFrame('nonexistent', 'Name');
      // No throw
    });
  });

  // ── selection ─────────────────────────────────────────────────────
  describe('selection', () => {
    it('selectFrame toggles on', () => {
      useUIStore.getState().selectFrame('frame-1');
      expect(useUIStore.getState().selectedFrameIds).toEqual(['frame-1']);
    });

    it('selectFrame toggles off when already selected', () => {
      useUIStore.setState({ selectedFrameIds: ['frame-1'] });
      useUIStore.getState().selectFrame('frame-1');
      expect(useUIStore.getState().selectedFrameIds).toEqual([]);
    });

    it('clearSelection resets to empty', () => {
      useUIStore.setState({ selectedFrameIds: ['a', 'b', 'c'] });
      useUIStore.getState().clearSelection();
      expect(useUIStore.getState().selectedFrameIds).toEqual([]);
    });
  });

  // ── clearAllFrames ────────────────────────────────────────────────
  describe('clearAllFrames', () => {
    it('resets all frame-related state', () => {
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
        nextFrameNumberByPage: { 'page-abc': 5 },
        selectedFrameIds: ['page-abc-frame-1'],
        currentFrameId: 'page-abc-frame-1',
      });

      useUIStore.getState().clearAllFrames();

      const state = useUIStore.getState();
      expect(state.framesByPage).toEqual({});
      expect(state.nextFrameNumberByPage).toEqual({});
      expect(state.selectedFrameIds).toEqual([]);
      expect(state.currentFrameId).toBeNull();
    });
  });

  // ── translateFrameRelative ────────────────────────────────────────
  describe('translateFrameRelative', () => {
    it('translates by exact vector when rotation is 0', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: {
          'page-abc': [makeFrame({ x: 100, y: 100, rotation: 0 })],
        },
      });

      useUIStore
        .getState()
        .translateFrameRelative('page-abc-frame-1', { x: 10, y: 20 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(110);
      expect(frame.y).toBe(120);
    });

    it('rotates vector before applying when frame has rotation', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: {
          'page-abc': [makeFrame({ x: 100, y: 100, rotation: 90 })],
        },
      });

      useUIStore
        .getState()
        .translateFrameRelative('page-abc-frame-1', { x: 10, y: 0 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      // 90 degree rotation: (10,0) -> (0,10) (approximately, due to rounding)
      expect(frame.x).toBe(100); // x + 0
      expect(frame.y).toBe(110); // y + 10
    });

    it('clamps result to page bounds', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: {
          'page-abc': [makeFrame({ x: 10, y: 10, rotation: 0 })],
        },
      });

      useUIStore
        .getState()
        .translateFrameRelative('page-abc-frame-1', { x: -100, y: -100 });

      const frame = useUIStore.getState().framesByPage['page-abc'][0];
      expect(frame.x).toBe(0);
      expect(frame.y).toBe(0);
    });

    it('no-ops when currentPage is null', () => {
      useUIStore.setState({
        currentPage: null,
        framesByPage: { 'page-abc': [makeFrame({ x: 100, y: 100 })] },
      });

      useUIStore
        .getState()
        .translateFrameRelative('page-abc-frame-1', { x: 10, y: 10 });

      // Unchanged because currentPage guard blocks the update
      expect(useUIStore.getState().framesByPage['page-abc'][0].x).toBe(100);
    });
  });

  // ── rotateFrame / setOrientation ──────────────────────────────────
  describe('rotateFrame', () => {
    it('adds delta angle', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame({ rotation: 10 })] },
      });

      useUIStore.getState().rotateFrame('page-abc-frame-1', 5);

      expect(useUIStore.getState().framesByPage['page-abc'][0].rotation).toBe(
        15
      );
    });

    it('allows unbounded rotation values', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame({ rotation: 350 })] },
      });

      useUIStore.getState().rotateFrame('page-abc-frame-1', 20);

      expect(useUIStore.getState().framesByPage['page-abc'][0].rotation).toBe(
        370
      );
    });
  });

  describe('setOrientation', () => {
    it('sets the orientation value', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame({ orientation: 0 })] },
      });

      useUIStore.getState().setOrientation('page-abc-frame-1', 270);

      expect(
        useUIStore.getState().framesByPage['page-abc'][0].orientation
      ).toBe(270);
    });
  });

  // ── updatePage ────────────────────────────────────────────────────
  describe('updatePage', () => {
    it('creates a new page and initializes frame arrays', () => {
      useUIStore.getState().updatePage(
        {
          width: 1000,
          height: 800,
          imageData: 'data:test',
        } as Partial<PageData>,
        '/test/image.png'
      );

      const state = useUIStore.getState();
      expect(state.currentPage).not.toBeNull();
      expect(state.currentPageId).toBeTruthy();
      expect(state.framesByPage[state.currentPageId!]).toEqual([]);
      expect(state.nextFrameNumberByPage[state.currentPageId!]).toBe(1);
    });

    it('preserves existing frames when revisiting a page', () => {
      // Set up a page with a frame
      useUIStore.getState().updatePage(
        {
          width: 1000,
          height: 800,
          imageData: 'data:test',
        } as Partial<PageData>,
        '/test/image.png'
      );
      const pageId = useUIStore.getState().currentPageId!;

      useUIStore.setState({
        framesByPage: { [pageId]: [makeFrame({ id: 'existing', pageId })] },
        nextFrameNumberByPage: { [pageId]: 5 },
      });

      // Revisit the same page
      useUIStore.getState().updatePage(
        {
          width: 1000,
          height: 800,
          imageData: 'data:test2',
        } as Partial<PageData>,
        '/test/image.png'
      );

      expect(useUIStore.getState().framesByPage[pageId]).toHaveLength(1);
      expect(useUIStore.getState().nextFrameNumberByPage[pageId]).toBe(5);
    });

    it('returns early when imagePath is falsy', () => {
      useUIStore.getState().updatePage({ width: 100 } as Partial<PageData>, '');
      expect(useUIStore.getState().currentPage).toBeNull();
    });
  });

  // ── view actions ──────────────────────────────────────────────────
  describe('view actions', () => {
    it('setActiveView sets the view', () => {
      useUIStore.getState().setActiveView('frame-editor');
      expect(useUIStore.getState().activeView).toBe('frame-editor');
    });

    it('switchToCanvas sets view to canvas', () => {
      useUIStore.setState({ activeView: 'frame-editor' });
      useUIStore.getState().switchToCanvas();
      expect(useUIStore.getState().activeView).toBe('canvas');
    });

    it('switchToFrameEditor sets view to frame-editor', () => {
      useUIStore.getState().switchToFrameEditor();
      expect(useUIStore.getState().activeView).toBe('frame-editor');
    });

    it('setCurrentFrameId sets or clears the value', () => {
      useUIStore.getState().setCurrentFrameId('frame-1');
      expect(useUIStore.getState().currentFrameId).toBe('frame-1');

      useUIStore.getState().setCurrentFrameId(null);
      expect(useUIStore.getState().currentFrameId).toBeNull();
    });
  });

  // ── setGridColumnWidth ────────────────────────────────────────────
  describe('setGridColumnWidth', () => {
    it('clamps to minimum of 120', () => {
      useUIStore.getState().setGridColumnWidth(50);
      expect(useUIStore.getState().gridColumnWidth).toBe(120);
    });

    it('clamps to maximum of 420', () => {
      useUIStore.getState().setGridColumnWidth(999);
      expect(useUIStore.getState().gridColumnWidth).toBe(420);
    });

    it('accepts values in range', () => {
      useUIStore.getState().setGridColumnWidth(250);
      expect(useUIStore.getState().gridColumnWidth).toBe(250);
    });
  });

  // ── computed getters ──────────────────────────────────────────────
  describe('computed getters', () => {
    it('getCurrentPageFrames returns frames for current page', () => {
      seedPage();
      useUIStore.setState({
        framesByPage: { 'page-abc': [makeFrame()] },
      });

      expect(useUIStore.getState().getCurrentPageFrames()).toHaveLength(1);
    });

    it('getCurrentPageFrames returns [] when no page', () => {
      expect(useUIStore.getState().getCurrentPageFrames()).toEqual([]);
    });

    it('findFrameById returns frame from any page', () => {
      useUIStore.setState({
        framesByPage: {
          'page-1': [makeFrame({ id: 'f1', pageId: 'page-1' })],
          'page-2': [makeFrame({ id: 'f2', pageId: 'page-2' })],
        },
      });

      expect(useUIStore.getState().findFrameById('f2')).toBeDefined();
      expect(useUIStore.getState().findFrameById('f2')?.id).toBe('f2');
    });

    it('findFrameById returns undefined for nonexistent', () => {
      expect(useUIStore.getState().findFrameById('nope')).toBeUndefined();
    });
  });
});
