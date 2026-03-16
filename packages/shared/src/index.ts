// Renderer-safe exports: types, geometry, constants, and pure utilities.
// These have no dependency on Node.js APIs or image-js and are safe to
// bundle into browser/renderer contexts.
//
// For Node.js-only exports (image-adapter, image-io, flood-fill, etc.),
// import from '@workspace/shared/node' instead.
export * from './types.js';
export * from './geometry.js';
export * from './constants.js';
export * from './color.js';
export * from './orientation.js';
export * from './convex-hull.js';
export * from './bounding-rectangle.js';
export * from './coordinate-utils.js';
export * from './utils/pageUtils.js';
