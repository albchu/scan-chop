import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFrameNavigation } from '../useFrameNavigation';
import type { FrameData } from '@workspace/shared';

const makeFrame = (id: string, hasImage = true): FrameData => ({
  id,
  label: id,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  orientation: 0,
  pageId: 'page-1',
  imageData: hasImage ? 'data:image/png;base64,test' : undefined,
});

describe('useFrameNavigation', () => {
  it('filters frames without imageData', () => {
    const frames = [
      makeFrame('f1', true),
      makeFrame('f2', false),
      makeFrame('f3', true),
    ];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.totalFrames).toBe(2);
  });

  it('returns index -1 and disables nav when currentFrameId is null', () => {
    const frames = [makeFrame('f1')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: null,
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.currentFrame).toBeNull();
  });

  it('identifies first frame position correctly', () => {
    const frames = [makeFrame('f1'), makeFrame('f2'), makeFrame('f3')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.canGoNext).toBe(true);
  });

  it('identifies last frame position correctly', () => {
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f2',
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.canGoPrevious).toBe(true);
    expect(result.current.canGoNext).toBe(false);
  });

  it('disables both directions for single frame', () => {
    const frames = [makeFrame('f1')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.canGoNext).toBe(false);
  });

  it('disables all nav for empty frames', () => {
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames: [],
        currentFrameId: null,
        onFrameChange: vi.fn(),
      })
    );

    expect(result.current.totalFrames).toBe(0);
    expect(result.current.currentFrame).toBeNull();
  });

  it('goToPrevious calls onFrameChange with previous ID', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f2',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToPrevious());
    expect(onChange).toHaveBeenCalledWith('f1');
  });

  it('goToNext calls onFrameChange with next ID', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToNext());
    expect(onChange).toHaveBeenCalledWith('f2');
  });

  it('goToFirst navigates to first frame', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2'), makeFrame('f3')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f3',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToFirst());
    expect(onChange).toHaveBeenCalledWith('f1');
  });

  it('goToLast navigates to last frame', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2'), makeFrame('f3')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToLast());
    expect(onChange).toHaveBeenCalledWith('f3');
  });

  it('goToPrevious is a no-op at first frame', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f1',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToPrevious());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('goToNext is a no-op at last frame', () => {
    const onChange = vi.fn();
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const { result } = renderHook(() =>
      useFrameNavigation({
        frames,
        currentFrameId: 'f2',
        onFrameChange: onChange,
      })
    );

    act(() => result.current.goToNext());
    expect(onChange).not.toHaveBeenCalled();
  });
});
