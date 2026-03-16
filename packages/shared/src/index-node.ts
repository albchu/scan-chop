/**
 * Node.js-only exports from @workspace/shared.
 *
 * These modules depend on image-js, Node.js fs/path, or other Node.js APIs
 * and cannot be loaded in a browser/renderer context.
 *
 * Import from '@workspace/shared/node' instead of '@workspace/shared' when
 * you need these.
 */

// Re-export everything from the renderer-safe barrel so callers can use
// a single import source for all shared code in Node.js contexts.
export * from './index.js';

// Node.js-only modules
export * from './image-adapter.js';
export * from './flood-fill.js';
export * from './image-io.js';
export * from './debug-visualization.js';
export * from './region-extraction.js';
export * from './image-transform.js';
export * from './image-processing.js';
