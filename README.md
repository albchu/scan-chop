# Scan Chop - Image Splitting Tool

A desktop application for automatically detecting and extracting individual images from scanned documents containing multiple photos or images.

## Overview

Scan Chop helps digitize collections of physical photos by intelligently splitting multi-image scans into separate files. Perfect for:

- Digitizing photo albums
- Processing batch-scanned documents
- Separating collaged images
- Extracting individual photos from contact sheets

## Key Features

- **Automatic Image Detection**: Uses computer vision to identify individual images within a larger scan
- **Lossless Extraction**: Preserves original image quality without recompression
- **Batch Processing**: Process entire directories of scanned images
- **Smart Cropping**: Automatically removes borders and adjusts for rotation
- **Preview & Adjust**: Fine-tune detection results before saving
- **Multiple Format Support**: Works with JPEG, PNG, and TIFF files

## 🏗️ Architecture

This application is built using a **modular, type-safe monorepo** with a **backend-managed state architecture**:

```
┌─────────────────┐
│   Electron App  │
│   (Desktop)     │
└─────────┬───────┘
          │
┌─────────▼─────────────────┐
│     Shared React UI       │
│   (Pure View Layer)       │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│    BackendAPI Interface   │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│    Electron Backend       │
│    (IPC Communication)    │
└───────────────────────────┘
```

### Key Architectural Benefits

- **🧠 Backend-Managed State**: All application state lives in the backend, ensuring consistency
- **🔄 Action-Based UI**: React components dispatch typed actions instead of managing state directly
- **🧩 Clean Architecture**: Separation between UI layer and Electron backend via `BackendAPI` interface
- **⚡ Reactive Updates**: UI automatically re-renders when subscribed state changes
- **🧪 Testable Architecture**: Backend logic and UI components can be tested independently

For detailed technical information, see our [Architecture Documentation](docs/ARCHITECTURE.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PNPM 8+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd scan-chop

# Install dependencies
pnpm install
```

### Development

```bash
# Start Electron app
pnpm dev

# Run all tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

### Production Build

```bash
# Build and package Electron app
pnpm build:electron
pnpm package:electron
```

## 📁 Project Structure

```
/apps
  /electron-app         → Electron desktop application
/packages
  /shared               → TypeScript types and interfaces
  /ui                   → React UI components and hooks
  /backend              → Electron backend implementation
```

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Desktop**: Electron with IPC communication
- **Build System**: Turborepo + PNPM workspaces  
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier

## 📚 Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md) - Detailed architecture and implementation guide
- [UI Architecture Documentation](docs/UI_ARCHITECTURE.md) - Visual editor UI design and component structure
- [Development Guide](docs/ARCHITECTURE.md#-development-commands) - Build system and workflow
- [Testing Strategy](docs/ARCHITECTURE.md#-testing-strategy) - Test architecture and practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
