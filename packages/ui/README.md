# UI Package - Visual Editor Components

A React-based visual editor for managing movable/resizable frames within a transformable canvas. This package contains all frontend-exclusive UI logic and components for the Scan Chop application.

## 🎯 Purpose

This UI package handles the **visual editor interface** for extracting individual images from scanned batches. Users can:
- Define extraction frames over a scanned image containing multiple photos
- Position and resize frames to capture individual images precisely
- Multi-select frames for batch extraction operations
- Preview and adjust frame boundaries before extraction
- Save high-resolution sub-images from the original scan

> **Note**: This tool focuses exclusively on **image extraction** ("chopping") - no image editing or touch-up functionality is included. For image editing, use dedicated photo editing software.

## 🏗️ Architecture Overview

The visual editor follows a **component-based architecture** with centralized UI state management:

```
Editor
├── UIContextProvider          → Manages all UI state and actions (using Immer)
├── Sidebar                    → Tool selection and controls
├── Canvas                     → Main editing area with scanned image
│   └── Page                   → Transformable container
│       └── Frame              → Extraction viewport overlays
└── FramesPreview              → Frame list and batch controls
    ├── BatchControls          → Multi-frame operations
    └── FrameList              → Individual frame cards
```

## 🧱 Core Components

| Component | Purpose |
|-----------|---------|
| **Editor** | Root component orchestrating the entire visual editor |
| **Canvas/Page/Frame** | Scanned image display with moveable extraction frames |
| **UIContext** | Centralized state management using Immer for immutability |
| **FramesPreview** | Side panel for frame management and batch operations |
| **FrameControlPanel** | Individual frame controls (rename, transform, save, delete) |

## 📁 Package Structure

```
packages/ui/src/
├── components/           → React components
│   ├── Editor.tsx       → Main editor component
│   ├── Canvas.tsx       → Canvas rendering area
│   ├── Frame.tsx        → Individual frame component
│   └── FramesPreview/   → Frame management components
├── context/             → React context providers
│   └── UIContext.tsx    → UI state management (Immer-based)
├── hooks/               → Custom React hooks
│   ├── useFrameTransform.ts → Frame transformation logic
│   ├── useBackend.ts        → Backend API integration
│   └── useReactiveSelector.ts → State subscription hook
└── utils/               → UI utility functions
    └── geometry.ts      → Geometric calculations
```

## 🎨 Styling & Animation

- **Tailwind CSS** for responsive design and utility classes
- **Tabler Icons** for consistent iconography
- **Smooth animations** via CSS transitions and transforms
- **Dark theme** with gray color palette for professional appearance
- **Responsive design** for both web and desktop environments

## 🔧 Key Features

- ✅ **Frame-based extraction** - Define viewports over scanned images
- ✅ **Multi-selection** with batch extraction operations
- ✅ **Frame orientation controls** (0°, 90°, 180°, -90°)
- ✅ **Real-time preview** of extraction boundaries
- ✅ **Performance optimized** with selective re-renders
- ✅ **Responsive layout** for various screen sizes

## 🧠 Logic Separation

### Frontend-Exclusive Logic (This Package)
- UI state management with Immer for immutability
- Frame viewport calculations and positioning
- Canvas rendering and visual feedback
- User input handling and validation
- Component lifecycle and React-specific logic

### Backend Logic (Future Integration)
- Actual image extraction and processing
- High-resolution sub-image generation
- File I/O operations and batch processing
- Scanner integration and image loading
- Export to digital photo libraries

> **Note**: The code in this UI package contains **all logic exclusive to the frontend**. Logic that ties to the backend will be eventually built for data relationships that make more sense to be contained within the backend layer.

## 📚 Documentation

- **Detailed UI Architecture**: See the full [UI Architecture Documentation](../../docs/UI_ARCHITECTURE.md)
- **Development Setup**: See the [main project README](../../README.md#-development-commands) for build commands and setup

## 🚀 Development

This package integrates with the larger Scan Chop monorepo architecture:

- **Types & Constants**: Imported from `@workspace/shared`
- **Backend Integration**: Via `BackendAPI` interface from `@workspace/shared`
- **Component Export**: Components exported for use in Electron and Web apps
- **State Management**: Uses Immer for predictable state updates

The UI package is designed to be **platform-agnostic** and works seamlessly across both Electron desktop and web browser environments. 