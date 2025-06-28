import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebBackend } from '../WebBackend';
import { INITIAL_STATE } from '@workspace/shared';

describe('useWebBackend', () => {
  it('initializes with default state', async () => {
    const { result } = renderHook(() => useWebBackend());
    
    const state = await result.current.getState();
    expect(state).toEqual(INITIAL_STATE);
  });

  it('handles incrementCounter action', async () => {
    const { result } = renderHook(() => useWebBackend());
    
    await act(async () => {
      await result.current.dispatch({ type: 'incrementCounter' });
    });
    
    const state = await result.current.getState();
    expect(state.counter).toBe(1);
  });

  it('handles resetApp action', async () => {
    const { result } = renderHook(() => useWebBackend());
    
    // First increment
    await act(async () => {
      await result.current.dispatch({ type: 'incrementCounter' });
      await result.current.dispatch({ type: 'incrementCounter' });
    });
    
    // Then reset
    await act(async () => {
      await result.current.dispatch({ type: 'resetApp' });
    });
    
    const state = await result.current.getState();
    expect(state.counter).toBe(0);
  });

  it('notifies subscribers on state changes', async () => {
    const { result } = renderHook(() => useWebBackend());
    
    const subscription = result.current.select('counter');
    const mockCallback = vi.fn();
    
    act(() => {
      subscription.subscribe(mockCallback);
    });
    
    await act(async () => {
      await result.current.dispatch({ type: 'incrementCounter' });
    });
    
    // Wait for the setTimeout in the dispatch function
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockCallback).toHaveBeenCalledWith(1);
  });

  it('returns current value from subscription', async () => {
    const { result } = renderHook(() => useWebBackend());
    
    await act(async () => {
      await result.current.dispatch({ type: 'incrementCounter' });
    });
    
    const subscription = result.current.select('counter');
    const value = await subscription.getValue();
    
    expect(value).toBe(1);
  });
}); 