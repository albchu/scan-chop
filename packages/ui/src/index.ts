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

// Core components
export { Editor } from './components/Editor';
export { Canvas } from './components/Canvas';
export { DividerButton } from './components/DividerButton';
export { Page } from './components/Page';
export { Frame } from './components/Frame';

// Layout components
export { ThreePanelLayout } from './components/Layout';
export { ZoomSlider } from './components/ZoomSlider';

// Preview components
export { FramesPreview } from './components/FramesPreview/FramesPreview';
export { FrameList } from './components/FramesPreview/FrameList';
export { FrameCard } from './components/FramesPreview/FrameCard';
export { FrameControlPanel } from './components/FramesPreview/FrameControlPanel';
export { BatchControls } from './components/FramesPreview/BatchControls';

// Context and providers
export { UIContextProvider, useUIContext } from './context/UIContext';

// Hooks
export { useBackend } from './hooks/useBackend';
export { useFrameTransform } from './hooks/useFrameTransform';
export { useReactiveSelector } from './hooks/useReactiveSelector';
export { useResizablePanels } from './hooks/useResizablePanels';

// Utils
export { rotateVector } from './utils/geometry';

// Examples
export { EditorExample } from './examples/EditorExample'; 