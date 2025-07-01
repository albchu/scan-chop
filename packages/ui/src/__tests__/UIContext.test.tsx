import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { UIContextProvider, useUIContext } from '../context/UIContext';

describe('UIContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UIContextProvider>{children}</UIContextProvider>
  );

  it('provides initial state', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    expect(result.current.frames).toEqual({});
    expect(result.current.selectedFrameIds).toEqual([]);
    expect(result.current.nextFrameNumber).toBe(1);
    expect(result.current.page.width).toBe(800);
    expect(result.current.page.height).toBe(600);
  });

  it('adds a frame', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    act(() => {
      result.current.addFrame({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0
      });
    });
    
    const frames = Object.values(result.current.frames);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      label: 'Frame 1',
      orientation: 0
    });
    expect(result.current.nextFrameNumber).toBe(2);
  });

  it('removes a frame', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Add a frame
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
    });
    
    const frameId = Object.keys(result.current.frames)[0];
    
    // Remove the frame
    act(() => {
      result.current.removeFrame(frameId);
    });
    
    expect(result.current.frames).toEqual({});
  });

  it('updates frame properties', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Add a frame
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
    });
    
    const frameId = Object.keys(result.current.frames)[0];
    
    // Update frame
    act(() => {
      result.current.updateFrame(frameId, { x: 200, y: 200, rotation: 45 });
    });
    
    expect(result.current.frames[frameId]).toMatchObject({
      x: 200,
      y: 200,
      rotation: 45
    });
  });

  it('manages selection state', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Add frames
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
      result.current.addFrame({ x: 200, y: 200, width: 200, height: 150, rotation: 0 });
    });
    
    const frameIds = Object.keys(result.current.frames);
    
    // Select first frame
    act(() => {
      result.current.selectFrame(frameIds[0]);
    });
    
    expect(result.current.selectedFrameIds).toEqual([frameIds[0]]);
    
    // Select second frame (multi-selection)
    act(() => {
      result.current.selectFrame(frameIds[1]);
    });
    
    expect(result.current.selectedFrameIds).toEqual([frameIds[0], frameIds[1]]);
    
    // Clear selection
    act(() => {
      result.current.clearSelection();
    });
    
    expect(result.current.selectedFrameIds).toEqual([]);
  });
}); 