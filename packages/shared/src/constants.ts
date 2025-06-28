import type { AppState } from './types';

/**
 * Initial state for the application
 * This is shared across all backend implementations
 */
export const INITIAL_STATE: AppState = {
  counter: 0
};

/**
 * Application constants
 */
export const APP_CONSTANTS = {
  // Default values
  DEFAULT_COUNTER: 0,
  
  // Action types (for reference)
  ACTIONS: {
    INCREMENT_COUNTER: 'incrementCounter',
    RESET_APP: 'resetApp'
  } as const
} as const; 