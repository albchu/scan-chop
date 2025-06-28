# 🚀 Platform-Agnostic React UI

A **modular, type-safe monorepo** demonstrating how to build a single React application that runs seamlessly across multiple platforms with **backend-managed state**.

## 🎯 The Challenge This Solves

Traditional cross-platform applications often suffer from:
- **Duplicated business logic** across web and desktop versions
- **Inconsistent state management** between platforms  
- **Tight coupling** between UI and platform-specific APIs
- **Complex testing** due to platform dependencies

## 💡 Our Solution

This project demonstrates a **pluggable backend architecture** where:

- 🧠 **All application state lives in the backend**, not React components
- 🔄 **UI dispatches typed actions** instead of managing state directly
- 🧩 **Backend implementations are swappable** via a shared `BackendAPI` interface
- ⚡ **React UI subscribes to state changes** and re-renders reactively
- 🧪 **Backend and UI layers are independently testable**

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Electron App  │    │    Web App      │
│   (Desktop)     │    │   (Browser)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────┬─────────┬─────┘
                 │         │
        ┌────────▼─────────▼────────┐
        │     Shared React UI       │
        │   (Pure View Layer)       │
        └─────────┬─────────────────┘
                  │
        ┌─────────▼─────────────────┐
        │    BackendAPI Interface   │
        └─┬─────────────────────┬───┘
          │                     │
    ┌─────▼──────┐    ┌────────▼──────┐
    │ Electron   │    │ Web Backend   │
    │ Backend    │    │ (In-Memory)   │
    │ (IPC)      │    │               │
    └────────────┘    └───────────────┘
```

## 🎬 **Demo Video**

🎥 **[Watch Setup Demo](https://drive.google.com/file/d/1FjGDfwAWrV8IZBr2eysPGmHR1BwnSi4_/view?usp=sharing)** - *See how to create a new project from this template in under 5 minutes*

> **Note**: Click the link above to watch the demo video showing the complete setup process.

## 🚀 Quick Start

### Using as Template

This repository is configured as a **GitHub Template Repository**. To create a new project:

1. **Click "Use this template"** → "Create a new repository"
2. **Clone your new repository**
3. **Run the customization script**: `node customize-template.js`
4. **Install dependencies**: `pnpm install`
5. **Start developing**: `pnpm dev`

### Development

```bash
# Install dependencies
pnpm install

# Start Electron app (default)
pnpm dev

# Or explicitly start Electron app
pnpm dev:electron

# Start Web app  
pnpm dev:web

# Run all tests
pnpm test
```

### Production Builds

```bash
# Build web app for production
pnpm build:web

# Build and package Electron app
pnpm build:electron
pnpm package:electron
```

## 📁 Project Structure

```
/apps
  /electron-app         → Electron runtime with IPC backend
  /web-app              → Web runtime with in-memory backend
/packages
  /shared               → TypeScript types (AppState, Action, BackendAPI)
  /ui                   → React UI components and hooks
  /backend-web          → Web backend implementation  
  /backend-electron     → Electron backend implementation
```

## 🔑 Key Features

### ✅ **Backend-Managed State**
All application state lives in the backend, ensuring consistency across platforms.

### ✅ **Type-Safe Action Dispatch**
UI dispatches strongly-typed actions instead of directly manipulating state.

### ✅ **Reactive Subscriptions**  
Components automatically re-render when subscribed state changes.

### ✅ **Pluggable Backends**
Swap between Electron IPC, web in-memory, or future implementations (HTTP API, WebSocket, etc.).

### ✅ **Independent Testing**
Backend logic and UI components can be tested in isolation.

### ✅ **Modern Build Pipeline**
Powered by Turborepo, Vite, and TypeScript for optimal developer experience.

## 🧪 Example Usage

```tsx
// React component using the backend
function Counter() {
  const counter = useReactiveSelector('counter');
  const backend = useBackend();

  return (
    <button onClick={() => backend.dispatch({ type: 'incrementCounter' })}>
      Clicked {counter} times
    </button>
  );
}

// App setup with injected backend
<AppProvider backend={electronBackend}>  {/* or webBackend */}
  <Counter />
</AppProvider>
```

## 📚 Documentation

For detailed technical information, see our [Technical Specification](docs/TECH_SPEC.md):

- [**Core Design Principles**](docs/TECH_SPEC.md#-core-design-principles) - Architecture philosophy
- [**API Contracts**](docs/TECH_SPEC.md#-api-contracts) - TypeScript interfaces
- [**Backend Implementations**](docs/TECH_SPEC.md#-backend-implementations) - Platform-specific details
- [**Testing Strategy**](docs/TECH_SPEC.md#-testing-strategy) - Test architecture
- [**Build System**](docs/TECH_SPEC.md#-build-system) - Turborepo configuration
- [**Why Turborepo**](docs/TECH_SPEC.md#-why-turborepo-over-direct-pnpm) - Build orchestration benefits

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Desktop**: Electron with IPC
- **Build System**: Turborepo + PNPM workspaces  
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier

## 🎨 Use Cases

This architecture pattern is ideal for:

- **Cross-platform desktop/web applications**
- **Applications requiring consistent business logic**
- **Projects with complex state management needs**
- **Teams wanting independent frontend/backend development**
- **Applications that may add new platforms in the future**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
