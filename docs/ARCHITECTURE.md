# 📘 Technical Specification: Scan Chop Application Architecture

---

## 🧭 Overview

This document describes the technical architecture of **Scan Chop**, an image splitting tool built as a **modular, type-safe, and testable monorepo** designed to run across:

* 🖥 **Electron (desktop)** with Node.js backend and IPC
* 🌐 **Web browser** with local in-memory state backend

The Scan Chop application uses a **backend-managed state architecture** where the React UI is **purely declarative and view-focused**:

* All application state is **exclusively owned and managed by the backend**
* The UI **dispatches typed actions** and **subscribes to backend state updates**
* **State access and reactivity** are handled through a **type-safe `BackendAPI`** interface injected at runtime

This architecture enables consistent image processing logic across platforms while maintaining clean separation between the UI layer and platform-specific implementations.

---

## 📁 Project Structure

```
/apps
  /electron-app         → Electron runtime: main, preload, renderer
  /web-app              → Web runtime: React entry
/packages
  /shared               → TypeScript shared types: AppState, Action, BackendAPI
  /ui                   → React UI + AppContext, hooks
  /backend-web          → Web backend implementation (local state only)
  /backend-electron     → Electron backend implementation using IPC
```

---

## 💡 Core Design Principles

| Principle             | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| 🧠 Centralized State  | All state lives in the backend, not in React components      |
| 🧩 Pluggable Backend  | Backend implementations conform to a shared `BackendAPI`     |
| 🔄 Action-Based Logic | UI dispatches actions instead of setting state directly      |
| ⚡ Reactive UI         | UI subscribes to state slices and re-renders on change       |
| 🧪 Fully Testable     | Backend and UI layers are independently and jointly testable |
| 🧼 Clean Separation   | Shared types and pure UI layer decoupled from runtime        |

---

## 🧾 API Contracts

```ts
// packages/shared/api.ts

export interface AppState extends Record<string, any> {
  counter: number;
}

export type Action =
  | { type: 'incrementCounter' }
  | { type: 'resetApp' };

export interface StateSubscription<T> {
  getValue(): Promise<T>;
  subscribe(callback: (value: T) => void): () => void;
}

export interface BackendAPI {
  dispatch(action: Action): Promise<void>;
  select<K extends keyof AppState>(
    key: K
  ): StateSubscription<AppState[K]>;
  getState(): Promise<AppState>;
}
```

---

## 💻 UI Layer (`packages/ui`)

The React UI is wrapped with an `AppProvider` that accepts any `BackendAPI`.

### Key Components

#### `AppProvider`

```ts
<AppProvider backend={someBackend}>
  <App />
</AppProvider>
```

#### `useBackend()`

A hook to access the injected `BackendAPI`.

#### `useReactiveSelector(key)`

A hook that:

* Subscribes to a specific key in `AppState`
* Re-renders the component on value change
* Provides default values while loading

### `App.tsx` Example

```tsx
const counter = useReactiveSelector('counter');
const backend = useBackend();

return (
  <button onClick={() => backend.dispatch({ type: 'incrementCounter' })}>
    Clicked {counter} times
  </button>
);
```

---

## 🧩 Backend Implementations

### ✅ `backend-electron`

* Uses `contextBridge` in preload to expose `BackendAPI` to renderer
* Main process holds state and emits updates via `EventEmitter`
* IPC channels: `'dispatch'`, `'select'`, `'getState'`

### ✅ `backend-web`

* Uses **local in-memory state** (no HTTP or fetch)
* Simulates subscriptions and updates using local function registry
* Suitable for demonstrating backend injection in a web-only setup

---

## 🔧 Runtime Entry Points

### Electron (`apps/electron-app/renderer.tsx`)

```tsx
<AppProvider backend={window.api}>
  <App />
</AppProvider>
```

### Web (`apps/web-app/index.tsx`)

```tsx
<AppProvider backend={webBackend}>
  <App />
</AppProvider>
```

---

## 🧪 Testing Strategy

* Uses [`vitest`](https://vitest.dev) and [`@testing-library/react`](https://testing-library.com)
* Test suites per backend + UI

| Layer              | Location                    | Tests                                   |
| ------------------ | --------------------------- | --------------------------------------- |
| `backend-electron` | `__tests__/backend.test.ts` | dispatch, state update, subscriptions   |
| `backend-web`      | `__tests__/backend.test.ts` | action simulation, local subscription   |
| `ui`               | `__tests__/App.test.tsx`    | full UI integration with mocked backend |

### Run All Tests

```bash
pnpm install
pnpm test
```

---

## 🛠 Build System

### Uses:

* **PNPM** for workspace management
* **Turborepo** for build/test orchestration and caching
* **Vite** for frontend bundling (development and production)
* **Electron Builder** for production app packaging and distribution
* **TypeScript** for type checking and compilation
* **ESLint + Prettier** for code quality and formatting

### Development Commands

| Task             | Command                          |
| ---------------- | -------------------------------- |
| Install all deps | `pnpm install`                   |
| Build all        | `pnpm build`                     |
| Start Electron   | `pnpm dev` or `pnpm dev:electron` |
| Start Web        | `pnpm dev:web`                   |
| Test All         | `pnpm test`                      |
| Lint All         | `pnpm lint`                      |
| Type Check       | `pnpm type-check`                |

### Production Build Commands

| Task                    | Command                                  | Output                                    |
| ----------------------- | ---------------------------------------- | ----------------------------------------- |
| Build Web (Production)  | `pnpm build:web`                        | `apps/web-app/dist/` (static files)      |
| Build Electron (Prod)   | `pnpm build:electron`                   | `apps/electron-app/dist/` (executable)   |
| Build All (Production)  | `pnpm build:prod`                       | Both web and electron production builds  |
| Package Electron        | `pnpm package:electron`                 | Platform-specific installers             |
| Release Electron        | `pnpm release:electron`                 | Electron builds with publishing          |

### Build Features

#### Web App Production Build
* **Tree shaking** and **dead code elimination**
* **Code splitting** with manual chunks for vendor and UI packages
* **Asset optimization** with Vite's built-in optimizations
* **Environment-specific configurations**

#### Electron Production Build
* **TypeScript compilation** for main process
* **Vite bundling** for renderer process
* **Basic packaging** with electron-builder
* **Multi-platform builds** (macOS, Windows, Linux)

---

## 🚀 Why Turborepo Over Direct PNPM?

This project's **multi-target architecture** (Electron + Web) with shared packages creates complex build dependencies that require sophisticated orchestration. While PNPM provides excellent workspace management, **Turborepo** adds the intelligent build coordination essential for this architecture:

### 🏎️ Performance Benefits

| Feature | PNPM Only | PNPM + Turborepo |
|---------|-----------|------------------|
| **Incremental Builds** | Manual script coordination | Automatic dependency-aware builds |
| **Caching** | No built-in caching | Intelligent local caching |
| **Parallelization** | Limited to `--parallel` flag | Smart parallel execution with dependency graphs |
| **Change Detection** | Rebuilds everything | Only rebuilds affected packages |

### 🎯 Multi-Target Build Coordination

This project requires building for **two distinct runtime targets** with shared dependencies:

```bash
# Without Turborepo: Manual coordination required
pnpm --filter shared build
pnpm --filter ui build
pnpm --filter backend-web build
pnpm --filter backend-electron build
pnpm --filter web-app build        # Web target
pnpm --filter electron-app build   # Electron target

# With Turborepo: Intelligent orchestration
turbo run build  # Builds both targets optimally
```

**Smart Pipeline Benefits:**
- **Shared packages** (`shared`, `ui`) built once, used by both targets
- **Backend implementations** built in parallel (no interdependency)
- **Target applications** built simultaneously after dependencies ready
- **Incremental builds**: Only rebuilds packages when source or dependencies change

### 🧠 Intelligent Dependency Management

Turborepo automatically analyzes the complex dependency graph:
```
shared ──┬─→ ui ──┬─→ web-app
         │        └─→ electron-app  
         ├─→ backend-web ──┘
         └─→ backend-electron ──┘
```

**Execution Strategy:**
1. **Level 1**: Build `shared` (foundation)
2. **Level 2**: Build `ui`, `backend-web`, `backend-electron` in parallel
3. **Level 3**: Build `web-app` and `electron-app` in parallel

### 💾 Local Caching Strategy

- **Input hashing**: Caches based on source files, dependencies, and environment
- **Output restoration**: Instantly restores previous build artifacts
- **Cache invalidation**: Smart cache busting when inputs change

### 🔄 Task Orchestration

The monorepo requires sophisticated task coordination:

```json
{
  "build:prod": {
    "dependsOn": ["^build", "type-check", "lint"],
    "outputs": ["dist/**", "build/**", "release/**"],
    "env": ["NODE_ENV", "VITE_*", "ELECTRON_*"]
  }
}
```

This ensures:
1. All dependencies are built first (`^build`)
2. Code quality gates pass (`type-check`, `lint`)
3. Environment variables are considered for cache keys
4. Outputs are properly tracked for caching

### 📊 Developer Experience Improvements

| Aspect | PNPM Scripts | Turborepo |
|--------|-------------|-----------|
| **Error Handling** | Stops on first failure | Continues building unaffected packages |
| **Progress Visibility** | Limited output | Rich progress indicators and timing |
| **Selective Execution** | Manual filtering | Automatic affected package detection |
| **Debugging** | Difficult to trace issues | Clear dependency visualization |

### 🔧 Multi-Target Architecture Challenges Solved

1. **Cross-Platform Builds**: Coordinates Electron and Web builds with shared dependencies
2. **Smart Incremental Builds**: Only rebuilds packages when source or dependencies change
3. **Parallel Target Compilation**: Builds both runtime targets simultaneously when possible
4. **Dependency Synchronization**: Ensures shared packages are built before target applications
5. **Development Efficiency**: Instant rebuilds during development when only one target is affected
6. **Testing Coordination**: Runs tests across all packages in dependency order

### 📈 Smart Pipeline Examples

**Development Scenario**: Changing only UI components
```bash
# Only rebuilds affected packages
turbo run build  # Skips backend-*, rebuilds ui → web-app + electron-app
```

**Backend Change**: Modifying Electron backend only
```bash
# Smart targeting
turbo run build  # Skips web-app, rebuilds backend-electron → electron-app
```

**Shared Type Change**: Updating shared interfaces
```bash
# Full rebuild cascade
turbo run build  # Rebuilds everything dependent on shared
```

**Production Builds**: Different targets, same efficiency
```bash
turbo run build:prod --filter=web-app      # Web production only
turbo run build:prod --filter=electron-app # Electron production only  
turbo run build:prod                       # Both targets optimally
```

---

## ⚙️ Workspace Configuration

### `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*
```

### Root `package.json` Scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:prod": "turbo run build:prod",
    "build:web": "turbo run build --filter=web-app",
    "build:electron": "turbo run build:prod --filter=electron-app",
    "package:electron": "turbo run package --filter=electron-app",
    "release:electron": "turbo run release --filter=electron-app",
    "dev": "turbo run dev --filter=electron-app",
    "dev:electron": "turbo run dev --filter=electron-app",
    "dev:web": "turbo run dev --filter=web-app",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules/.cache"
  }
}
```

### `turbo.json` Configuration

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", "lib/**"]
    },
    "build:prod": {
      "dependsOn": ["^build", "type-check", "lint"],
      "outputs": ["dist/**", "build/**", "release/**"],
      "env": ["NODE_ENV", "VITE_*", "ELECTRON_*"]
    },
    "package": {
      "dependsOn": ["build:prod"],
      "outputs": ["release/**", "dist/**"]
    },
    "release": {
      "dependsOn": ["package"],
      "outputs": ["release/**"],
      "env": ["GH_TOKEN", "APPLE_*", "CSC_*", "WIN_CSC_*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Web App Build Configuration (`apps/web-app/vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? './' : '/',
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@workspace/ui']
        }
      }
    },
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
}));
```

### Electron Build Configuration

#### Vite Config (`apps/electron-app/vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'renderer.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

#### Electron Builder Config (`apps/electron-app/electron-builder.json`)

```json
{
  "appId": "com.albchu.scan-chop",
  "productName": "Scan Chop",
  "directories": {
    "output": "release",
    "buildResources": "build-resources"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraMetadata": {
    "main": "dist/main.js"
  },
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      }
    ],
    "category": "Office"
  }
}
```

## 🔧 Development Workflow

### Quality Gates
* **TypeScript strict mode** enabled
* **ESLint** with React and accessibility rules
* **Prettier** for consistent formatting
* **Unit tests** with Vitest and React Testing Library
