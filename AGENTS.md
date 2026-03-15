# AGENTS.md

## Project Overview

Scan Chop is an Electron desktop app for automatically detecting and extracting individual images from scanned documents containing multiple photos.

## Tech Stack

- **Runtime**: Electron (Node.js backend + Chromium renderer)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **State**: Zustand stores (UI state) + backend services via IPC (processing)
- **Build**: Turborepo + pnpm workspaces
- **Testing**: Vitest + React Testing Library

## Architecture

```
apps/electron-app/     → Electron main/preload/renderer entry points
packages/
  shared/              → Types, image processing algorithms (image-js)
  ui/                  → React components (view-only, no business logic)
  backend/             → Electron IPC handlers, services
```

**Key patterns**:

- UI state lives in Zustand stores. Heavy processing (image analysis, cropping) delegates to backend via IPC. React components are the view layer; stores handle state logic.
- **Dual-resolution image strategy**: Images are cached at both full resolution and scaled down (max 1920px via `MAX_SCALED_DIMENSION`). Bounding box detection runs on the scaled version for performance, then coordinates are scaled up and cropping is performed on the full-resolution original for output quality.
- **In-memory persistence**: Frames exist only in memory during a session. There is no database; closing the app loses unsaved frame state.

**Build formats**: `shared` produces dual CJS/ESM output (three separate tsconfig files). `backend` is CJS-only (required by Electron main process). `ui` is ESM.

## Dependency Graph

```
shared → ui → electron-app
shared → backend → electron-app
```

## Essential Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Electron in dev mode
pnpm dev:debug        # Start with DEBUG=true (saves frame debug images)
pnpm test             # Run all tests
pnpm lint             # ESLint
pnpm type-check       # TypeScript validation
pnpm build            # Build all packages
pnpm build:electron   # Production Electron build
```

## Key Files

| File                                            | Purpose                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/shared/src/types.ts`                  | Core types: `FrameData`, `PageData`, `BoundingBox`, `ProcessingConfig` |
| `packages/shared/src/constants.ts`              | Shared constants: `MIN_FRAME_SIZE`, `DEFAULT_FRAME_SIZE_RATIO`         |
| `packages/shared/src/image-processing.ts`       | Main image processing pipeline                                         |
| `packages/shared/src/region-extraction.ts`      | Flood-fill region detection                                            |
| `packages/shared/src/flood-fill.ts`             | BFS flood fill with color predicate and pixel cap                      |
| `packages/shared/src/convex-hull.ts`            | Andrew's monotone chain convex hull                                    |
| `packages/shared/src/bounding-rectangle.ts`     | Oriented bounding box calculation                                      |
| `packages/shared/src/orientation.ts`            | PCA orientation estimation and angle refinement                        |
| `packages/shared/src/image-transform.ts`        | `smartCrop()` and rotation-aware sub-image extraction                  |
| `packages/shared/src/color.ts`                  | Brightness calculation and white boundary predicate                    |
| `packages/shared/src/geometry.ts`               | Point rotation, bounds checking, angle normalization                   |
| `packages/shared/src/coordinate-utils.ts`       | Scale/transform between display and original coordinates               |
| `packages/backend/src/services/FrameService.ts` | Frame creation/update/delete logic                                     |
| `packages/backend/src/ipc/handlers.ts`          | IPC handler registration                                               |
| `packages/ui/src/stores/`                       | Zustand stores (uiStore, workspaceStore, canvasStore)                  |
| `packages/ui/src/api/workspace.ts`              | Frontend API wrapper for IPC calls                                     |
| `packages/ui/src/components/Editor.tsx`         | Main UI layout component                                               |
| `packages/ui/src/components/Canvas/`            | Interactive image viewer                                               |

## Image Processing Flow

Detection runs on the scaled image for performance; cropping uses the full-resolution original for output quality.

1. User clicks seed point on image in Canvas
2. `extractRegionWithWhiteBoundary()` - flood-fill from seed until white boundary (threshold: 230)
3. `findMinimalBoundingRectangle()` - convex hull with rotating calipers (+ optional PCA via `usePca` config)
4. Bounding box coordinates are scaled up from display to original resolution
5. `smartCrop()` - extract sub-image at full resolution with rotation correction
6. `FrameData` created with coordinates, rotation, base64 imageData

## Important Types

```typescript
interface FrameData {
  id: string; // Format: "{pageId}-frame-{n}"
  label: string;
  x: number;
  y: number; // Position in display coordinates
  width: number;
  height: number;
  rotation: number; // Degrees
  orientation: 0 | 90 | 180 | 270; // "Up" direction indicator
  imageData?: string; // Base64 cropped image
  imageScaleFactor?: number; // Display to original scale
  pageId: string; // Links to parent page
  imagePath?: string; // Source image path for navigation
}

interface ProcessingConfig {
  downsampleFactor?: number; // Internal downscale factor (backend uses 0.3, shared CLI uses 0.75)
  whiteThreshold?: number; // 0-255, default 230 in code (note: WHITE_THRESHOLD_DEFAULT constant is 220)
  minArea?: number; // Min pixels for valid region
  maxPixels?: number; // Flood fill limit
  cropInset?: number; // Pixels to trim from edges (default 8)
  padding?: number;
  minRotation?: number; // Min rotation angle to apply in degrees (default 0.2)
  usePca?: boolean; // Use PCA for orientation estimation
  enableAngleRefine?: boolean; // Enable angle refinement search
  angleRefineWindow?: number; // Search window for refinement in degrees (default 3)
  angleRefineIterations?: number; // Iterations for angle refinement (default 10)
  generateDebugImages?: boolean;
}
```

## UI State Management

Uses Zustand stores in `packages/ui/src/stores/`:

- `uiStore` - UI state (current page, frames, selection, loading state, active view)
- `workspaceStore` - Directory/file navigation state
- `canvasStore` - Canvas zoom, pan, scale calculations

All stores use `immer` middleware, so update actions use direct mutation syntax that produces immutable state updates.

**Component hierarchy**: `App` -> `Editor` -> `AppBar` + `ThreePanelLayout(FileExplorer, TabbedView, FramesPreview)`. `TabbedView` switches between the `Canvas` (interactive image viewer) and `FrameEditorNew` (frame adjustment view).

## IPC Communication

Backend exposes API via `contextBridge` in preload as `window.backend`:

```typescript
window.backend.invoke('workspace:loadDirectory', path, options?)
window.backend.invoke('workspace:loadImage', imagePath)
window.backend.invoke('workspace:generateFrame', imagePath, seed, config?)
window.backend.invoke('workspace:updateFrame', frameId, updates)
window.backend.invoke('workspace:saveFrame', frameData)
window.backend.invoke('workspace:rotateFrame', frameData)
window.backend.invoke('workspace:clearCache', path?)
window.backend.invoke('workspace:selectDirectory')
window.backend.invoke('workspace:checkFilesExist', directory, filenames)
window.backend.invoke('workspace:saveAllFrames', directory, frames, filenames)
```

Note: The backend also registers `workspace:clearImageCache` and `workspace:getImageCacheStats` handlers, but these are **not whitelisted** in `preload.ts` and are unreachable from the renderer.

UI wraps these calls in `packages/ui/src/api/workspace.ts`.

## Backend Services

`ElectronBackend` is the entry point, instantiated in `main.ts`. It creates a `WorkspaceService` and wires up IPC handlers.

**`WorkspaceService`** (`packages/backend/src/services/WorkspaceService.ts`) is the main facade, composing:

- **`FrameService`** - Frame CRUD and the seed-to-frame generation pipeline
- **`DirectoryScanner`** - Recursive directory scanning with depth control
- **`DirectoryCacheManager`** - TTL-based directory tree cache (5 min default)
- **`DirectoryPreloader`** - Background preloading of subdirectories

**Image cache**: `WorkspaceService` maintains an LRU cache of 10 images, storing both full-resolution and scaled pairs. In-flight loads are deduplicated via a promises map to avoid redundant I/O.

## Testing

- Unit tests in `__tests__/` directories within each package
- Run specific package: `pnpm --filter @workspace/shared test`
- Coverage: `pnpm test -- --coverage`
- **Caveat**: `@workspace/shared` configures vitest without `--run`, so `pnpm test` enters watch mode for that package and never exits. When running tests non-interactively (CI, scripts, agents), use `pnpm --filter @workspace/shared test:once` or run `vitest run` directly to avoid hanging.

## Common Modifications

**Add new processing option**:

1. Add to `ProcessingConfig` in `packages/shared/src/types.ts`
2. Handle in relevant function in `packages/shared/src/`

**Add UI component**:

1. Create in `packages/ui/src/components/`
2. Export from appropriate index.ts

**Add IPC handler**:

1. Add handler in `packages/backend/src/ipc/handlers.ts`
2. Whitelist channel in `apps/electron-app/src/preload.ts`
3. Add wrapper function in `packages/ui/src/api/workspace.ts`

## Release Build

Build Mac DMG installers:

```bash
pnpm build                              # Build all packages
pnpm --filter electron-app build:prod   # Production build
pnpm --filter electron-app package      # Create DMG
```

Output: `apps/electron-app/release/`

- `Scan Chop-1.0.0-arm64.dmg` - Apple Silicon
- `Scan Chop-1.0.0.dmg` - Intel x64

**Notes:**

- App is unsigned (shows security warning on first open)
- Uses `node-linker=hoisted` in `.npmrc` for electron-builder compatibility
- electron version pinned in `apps/electron-app/package.json`

## Agent Rules

- **Never perform git operations** (commit, push, branch, stash, etc.) unless explicitly instructed by the user.

## Conventions

- Bounding boxes use display coordinates (scaled), not original image coordinates
- `scaleFactor = scaled_dimension / original_dimension`
- Frame IDs: `{pageId}-frame-{n}`
- Page IDs: hash of image path via `generatePageId()`
