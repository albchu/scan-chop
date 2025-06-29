/**
 * @workspace/ui
 * 
 * To use the UI components with proper styling, import the CSS file:
 * import '@workspace/ui/dist/styles/index.css';
 * 
 * Or if your bundler supports the "style" field in package.json:
 * The CSS will be automatically resolved.
 */

// Main exports
export { App } from './App';
export { AppProvider } from './AppProvider';

// Components
export { Editor } from './components/Editor';

// Contexts
export { UIContextProvider, useUIContext } from './context/UIContext';
export { FrameRefRegistryProvider, useFrameRefRegistry } from './context/FrameRefRegistryContext';

// Hooks
export { useBackend } from './hooks/useBackend';
export { useReactiveSelector } from './hooks/useReactiveSelector';
export { useFrameTransform } from './hooks/useFrameTransform';

// Utils
export { rotateVector } from './utils/geometry';

// Examples
export { EditorExample, imageToBase64 } from './examples/EditorExample'; 