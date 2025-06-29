import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, AppProvider } from '@workspace/ui';
import type { BackendAPI } from '@workspace/shared';

// Import the CSS styles from the UI package
import '@workspace/ui/dist/styles/index.css';

// Type declaration for the API exposed by preload
declare global {
  interface Window {
    api: BackendAPI;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider backend={window.api}>
      <App />
    </AppProvider>
  </React.StrictMode>
);
