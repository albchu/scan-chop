import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { UIContextProvider, useUIContext } from '../context/UIContext';

describe('UIContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UIContextProvider>{children}</UIContextProvider>
  );

  it('provides initial state', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    expect(result.current.framesByPage).toEqual({});
    expect(result.current.currentPageFrames).toEqual([]);
    expect(result.current.selectedFrameIds).toEqual([]);
    expect(result.current.currentPage).toBeNull();
    expect(result.current.currentPageId).toBeNull();
    expect(result.current.pageLoadingState).toBe('empty');
  });

  it('updates page and generates pageId', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test',
      }, '/test/image.png');
    });
    
    expect(result.current.currentPage).toMatchObject({
      width: 800,
      height: 600,
      imageData: 'data:image/png;base64,test',
      imagePath: '/test/image.png',
    });
    expect(result.current.currentPageId).toBeTruthy();
    expect(result.current.currentPageId).toMatch(/^page-/);
  });

  it('adds a frame to current page', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // First set up a page
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test',
      }, '/test/image.png');
    });
    
    const pageId = result.current.currentPageId!;
    
    // Add a frame
    act(() => {
      result.current.addFrame({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0
      });
    });
    
    expect(result.current.currentPageFrames).toHaveLength(1);
    expect(result.current.currentPageFrames[0]).toMatchObject({
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      label: 'Frame 1',
      orientation: 0,
      pageId: pageId
    });
  });

  it('removes a frame', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Set up page and add a frame
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test',
      }, '/test/image.png');
    });
    
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
    });
    
    const frameId = result.current.currentPageFrames[0].id;
    
    // Remove the frame
    act(() => {
      result.current.removeFrame(frameId);
    });
    
    expect(result.current.currentPageFrames).toEqual([]);
  });

  it('updates frame properties', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Set up page and add a frame
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test',
      }, '/test/image.png');
    });
    
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
    });
    
    const frameId = result.current.currentPageFrames[0].id;
    
    // Update frame
    act(() => {
      result.current.updateFrame(frameId, { x: 200, y: 200, rotation: 45 });
    });
    
    const updatedFrame = result.current.findFrameById(frameId);
    expect(updatedFrame).toMatchObject({
      x: 200,
      y: 200,
      rotation: 45
    });
  });

  it('manages selection state', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Set up page and add frames
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test',
      }, '/test/image.png');
    });
    
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
      result.current.addFrame({ x: 200, y: 200, width: 200, height: 150, rotation: 0 });
    });
    
    const frameIds = result.current.currentPageFrames.map(f => f.id);
    
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

  it('maintains separate frames for different pages', () => {
    const { result } = renderHook(() => useUIContext(), { wrapper });
    
    // Load first image
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test1',
      }, '/test/image1.png');
    });
    
    const page1Id = result.current.currentPageId!;
    
    // Add frames to first page
    act(() => {
      result.current.addFrame({ x: 100, y: 100, width: 200, height: 150, rotation: 0 });
      result.current.addFrame({ x: 200, y: 200, width: 200, height: 150, rotation: 0 });
    });
    
    expect(result.current.currentPageFrames).toHaveLength(2);
    
    // Load second image
    act(() => {
      result.current.updatePage({
        width: 1000,
        height: 800,
        imageData: 'data:image/png;base64,test2',
      }, '/test/image2.png');
    });
    
    const page2Id = result.current.currentPageId!;
    expect(page2Id).not.toBe(page1Id);
    
    // Second page should have no frames
    expect(result.current.currentPageFrames).toHaveLength(0);
    
    // Add frame to second page
    act(() => {
      result.current.addFrame({ x: 50, y: 50, width: 100, height: 100, rotation: 0 });
    });
    
    expect(result.current.currentPageFrames).toHaveLength(1);
    
    // Switch back to first image - same path should generate same pageId
    act(() => {
      result.current.updatePage({
        width: 800,
        height: 600,
        imageData: 'data:image/png;base64,test1',
      }, '/test/image1.png');
    });
    
    // Should have same pageId and still have 2 frames
    expect(result.current.currentPageId).toBe(page1Id);
    expect(result.current.currentPageFrames).toHaveLength(2);
  });
}); 