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

/**
 * UI Editor constants
 */
export const MIN_FRAME_SIZE = 20;
export const DEFAULT_FRAME_SIZE_RATIO = 0.1; // 10% of page dimensions
export const TRANSLATION_STEP = 10; // pixels for arrow key movement
export const ROTATION_INCREMENT = 0.5; // degrees for rotation buttons 