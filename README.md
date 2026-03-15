# Scan Chop - Image Splitting Tool

A desktop application for automatically detecting and extracting individual images from scanned documents containing multiple photos or images.

## Overview

Scan Chop helps digitize collections of physical photos by intelligently splitting multi-image scans into separate files. Perfect for:

- Digitizing photo albums
- Processing batch-scanned documents
- Separating collaged images
- Extracting individual photos from contact sheets

## Key Features

- **Automatic Image Detection**: Click anywhere on a photo in a scan and Scan Chop detects the boundaries via flood fill + convex hull + rotating calipers
- **Full-Resolution Extraction**: Detection runs on a downscaled image for speed, but final crops are always from the original resolution
- **Smart Cropping**: Automatically corrects for rotation and trims edge artifacts
- **Interactive Adjustment**: Drag, resize, and rotate detected frames directly on the canvas with react-moveable
- **Batch Save**: Save all detected frames at once with conflict detection and filename management
- **Multiple Format Support**: Works with JPEG, PNG, GIF, BMP, WebP, SVG, and TIFF files

## Architecture

```
apps/electron-app/     -> Electron main/preload/renderer entry points
packages/
  shared/              -> Core types, image processing algorithms (image-js)
  ui/                  -> React components, Zustand stores, API layer
  backend/             -> Electron IPC handlers, services, caching
```

The application uses a split architecture:

- **UI state** (pages, frames, selection, zoom/pan) lives in **Zustand stores** in the renderer process
- **Heavy processing** (image loading, flood-fill detection, cropping, file I/O) runs in the **Electron main process** via IPC
- **React components** are the view layer; stores handle state logic; the backend handles compute and disk access

```
Renderer (React + Zustand)  <--IPC invoke/response-->  Main Process (Services)
       |                                                       |
   Zustand stores                                    WorkspaceService
   (uiStore, workspaceStore, canvasStore)            FrameService
       |                                             DirectoryScanner
   React components                                  DirectoryCacheManager
   (Canvas, FrameEditor, FileExplorer, etc.)         DirectoryPreloader
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
git clone https://github.com/albchu/scan-chop.git
cd scan-chop
pnpm install
```

### Development

```bash
pnpm dev              # Start Electron app in dev mode
pnpm dev:debug        # Start with DEBUG=true (saves frame debug images)
pnpm test             # Run all tests
pnpm lint             # ESLint
pnpm type-check       # TypeScript validation
```

### Production Build

```bash
pnpm build                              # Build all packages
pnpm --filter electron-app build:prod   # Production build
pnpm --filter electron-app package      # Create platform installers
```

Output in `apps/electron-app/release/`.

## Tech Stack

- **Runtime**: Electron 28 (Node.js backend + Chromium renderer)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4
- **State Management**: Zustand with Immer middleware
- **Image Processing**: image-js, custom algorithms (flood fill, convex hull, rotating calipers)
- **Frame Manipulation**: react-moveable (drag, resize, rotate)
- **Build System**: Turborepo + pnpm workspaces
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
