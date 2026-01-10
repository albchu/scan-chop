# CLAUDE.md

## Project Overview

Scan Chop is an Electron desktop app for automatically detecting and extracting individual images from scanned documents containing multiple photos.

## Tech Stack

- **Runtime**: Electron (Node.js backend + Chromium renderer)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **State**: Backend-managed via IPC (not React state)
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

**Key pattern**: All application state lives in the backend. UI components dispatch typed actions via `BackendAPI` interface and subscribe to state updates. React is purely a view layer.

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

| File | Purpose |
|------|---------|
| `packages/shared/src/types.ts` | Core types: `FrameData`, `PageData`, `BoundingBox`, `ProcessingConfig` |
| `packages/shared/src/api.ts` | `BackendAPI` interface definition |
| `packages/shared/src/image-processing.ts` | Main image processing pipeline |
| `packages/shared/src/region-extraction.ts` | Flood-fill region detection |
| `packages/shared/src/bounding-rectangle.ts` | Oriented bounding box calculation |
| `packages/backend/src/services/FrameService.ts` | Frame creation/update/delete logic |
| `packages/ui/src/stores/` | Zustand stores (uiStore, workspaceStore, canvasStore) |
| `packages/ui/src/components/Editor.tsx` | Main UI layout component |
| `packages/ui/src/components/Canvas/` | Interactive image viewer |

## Image Processing Flow

1. User clicks seed point on image in Canvas
2. `extractRegionWithWhiteBoundary()` - flood-fill from seed until white boundary (threshold: 230)
3. `findMinimalBoundingRectangle()` - convex hull + PCA for oriented bounding box
4. `smartCrop()` - extract sub-image at full resolution with rotation correction
5. `FrameData` created with coordinates, rotation, base64 imageData

## Important Types

```typescript
interface FrameData {
  id: string;
  label: string;
  x: number; y: number;           // Position in display coordinates
  width: number; height: number;
  rotation: number;               // Degrees
  orientation: 0 | 90 | 180 | 270;
  imageData?: string;             // Base64 cropped image
  imageScaleFactor?: number;      // Display to original scale
  pageId: string;                 // Links to parent page
}

interface ProcessingConfig {
  whiteThreshold?: number;        // 0-255, default 230
  minArea?: number;               // Min pixels for valid region
  maxPixels?: number;             // Flood fill limit
  cropInset?: number;             // Pixels to trim from edges
  generateDebugImages?: boolean;
}
```

## UI State Management

Uses Zustand stores in `packages/ui/src/stores/`:
- `uiStore` - UI state (current page, frames, selection, loading state)
- `workspaceStore` - Directory/file navigation state
- `canvasStore` - Canvas zoom, pan, tool state

## IPC Communication

Backend exposes API via `contextBridge` in preload:
```typescript
window.api.workspace.loadDirectory(path)
window.api.workspace.onDirectoryReady(callback)
window.api.workspace.onImageReady(callback)
```

## Testing

- Unit tests in `__tests__/` directories within each package
- Run specific package: `pnpm --filter @workspace/shared test`
- Coverage: `pnpm test -- --coverage`

## Common Modifications

**Add new processing option**: 
1. Add to `ProcessingConfig` in `packages/shared/src/types.ts`
2. Handle in relevant function in `packages/shared/src/`

**Add UI component**:
1. Create in `packages/ui/src/components/`
2. Export from appropriate index.ts

**Add IPC handler**:
1. Define message types in `packages/shared/src/ipcMessages.ts`
2. Add handler in `packages/backend/src/ipc/handlers.ts`
3. Expose via `BackendAPI` in `packages/shared/src/api.ts`

## Conventions

- Bounding boxes use display coordinates (scaled), not original image coordinates
- `scaleFactor = scaled_dimension / original_dimension`
- Frame IDs: `{pageId}-frame-{n}`
- Page IDs: hash of image path via `generatePageId()`
