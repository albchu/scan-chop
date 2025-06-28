import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../AppProvider';
import { App } from '../App';
import type { BackendAPI, StateSubscription, Action, AppState } from '@workspace/shared';
import { INITIAL_STATE } from '@workspace/shared';

// Mock backend for testing
class MockBackend implements BackendAPI {
  private state: AppState = { ...INITIAL_STATE };
  private listeners = new Map<keyof AppState, Set<(value: any) => void>>();

  constructor() {
    Object.keys(this.state).forEach(key => {
      this.listeners.set(key, new Set());
    });
  }

  async dispatch(action: Action): Promise<void> {
    switch (action.type) {
      case 'incrementCounter':
        this.state = { ...this.state, counter: this.state.counter + 1 };
        this.notifyListeners('counter', this.state.counter);
        break;
      case 'resetApp':
        this.state = { ...INITIAL_STATE };
        this.notifyListeners('counter', this.state.counter);
        break;
    }
  }

  select<K extends keyof AppState>(key: K): StateSubscription<AppState[K]> {
    const self = this;
    return {
      async getValue() {
        return self.state[key];
      },
      subscribe: (callback: (value: AppState[K]) => void) => {
        const listeners = self.listeners.get(key);
        if (listeners) {
          listeners.add(callback);
          return () => listeners.delete(callback);
        }
        return () => {};
      }
    };
  }

  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  private notifyListeners<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(listener => listener(value));
    }
  }
}

describe('App', () => {
  it('renders counter and buttons', async () => {
    const mockBackend = new MockBackend();
    
    render(
      <AppProvider backend={mockBackend}>
        <App />
      </AppProvider>
    );

    expect(screen.getByText('🖼️ Scan Chop')).toBeInTheDocument();
    expect(screen.getByText(/Counter value:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Increment/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset/ })).toBeInTheDocument();
  });

  it('increments counter when increment button is clicked', async () => {
    const mockBackend = new MockBackend();
    
    render(
      <AppProvider backend={mockBackend}>
        <App />
      </AppProvider>
    );

    const incrementButton = screen.getByRole('button', { name: /Increment/ });
    fireEvent.click(incrementButton);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('resets counter when reset button is clicked', async () => {
    const mockBackend = new MockBackend();
    
    render(
      <AppProvider backend={mockBackend}>
        <App />
      </AppProvider>
    );

    // First increment
    const incrementButton = screen.getByRole('button', { name: /Increment/ });
    fireEvent.click(incrementButton);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Then reset
    const resetButton = screen.getByRole('button', { name: /Reset/ });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
}); 