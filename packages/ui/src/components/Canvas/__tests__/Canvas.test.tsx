import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { Canvas } from '../Canvas';
import { useCanvasStore } from '../../../stores/canvasStore';

// Stub child components — not relevant to ResizeObserver wiring
vi.mock('../components/CanvasViewport', () => ({
  CanvasViewport: () => <div data-testid="canvas-viewport" />,
}));
vi.mock('../components/CanvasControls', () => ({
  CanvasControls: () => <div data-testid="canvas-controls" />,
}));
vi.mock('../components/CanvasDebugInfo', () => ({
  CanvasDebugInfo: () => <div data-testid="canvas-debug" />,
}));

// Stub custom hooks with inert defaults
vi.mock('../hooks/useKeyboardModifiers', () => ({
  useKeyboardModifiers: () => ({ isCommandPressed: false }),
}));
vi.mock('../hooks/usePanAndZoom', () => ({
  usePanAndZoom: () => ({
    isDragging: false,
    handleMouseDown: vi.fn(),
    handleContextMenu: vi.fn(),
  }),
}));
vi.mock('../hooks/useCanvasInteraction', () => ({
  useCanvasInteraction: () => ({
    handleCanvasClick: vi.fn(),
    isGenerating: false,
  }),
}));

// Capture the ResizeObserver callback so tests can trigger it manually
let resizeCallback: ConstructorParameters<typeof ResizeObserver>[0];
const observeMock = vi.fn();
const disconnectMock = vi.fn();

beforeEach(() => {
  // jsdom does not provide ResizeObserver — supply a controllable mock.
  // Vitest 4 requires function/class for mocks invoked with `new`.
  global.ResizeObserver = vi.fn(function (
    this: ResizeObserver,
    cb: ResizeObserverCallback
  ) {
    resizeCallback = cb;
    return {
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: vi.fn(),
    };
  }) as unknown as typeof ResizeObserver;

  useCanvasStore.setState({
    zoom: 100,
    panOffset: { x: 0, y: 0 },
    canvasSize: { width: 0, height: 0 },
    pageWidth: 0,
    pageHeight: 0,
    baseScale: 1,
    totalScale: 1,
  });
});

afterEach(() => {
  cleanup();
  observeMock.mockClear();
  disconnectMock.mockClear();
});

describe('Canvas ResizeObserver integration', () => {
  it('creates a ResizeObserver and observes the canvas element on mount', () => {
    render(<Canvas />);

    expect(global.ResizeObserver).toHaveBeenCalledTimes(1);
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it('calls setCanvasSize when the observer reports a resize', () => {
    render(<Canvas />);

    // Simulate a resize observation — wrapped in act since it triggers store
    // updates that cause a React re-render
    act(() => {
      resizeCallback(
        [{ contentRect: { width: 750, height: 500 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    const state = useCanvasStore.getState();
    expect(state.canvasSize).toEqual({ width: 750, height: 500 });
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Canvas />);

    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('does not register a window resize listener', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');

    render(<Canvas />);

    const resizeCalls = addEventSpy.mock.calls.filter(
      ([event]) => event === 'resize'
    );
    expect(resizeCalls).toHaveLength(0);

    addEventSpy.mockRestore();
  });
});
