import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@workspace/ui';

// Import the CSS styles from the UI package
import '@workspace/ui/dist/styles/index.css';

// Type declaration for the API exposed by preload
declare global {
  interface Window {
    backend: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}

// Debug logging
console.log('[Renderer] Starting...');
console.log('[Renderer] window.backend:', window.backend);

// Wait for window.backend to be available
function renderApp() {
  if (!window.backend) {
    console.error(
      '[Renderer] window.backend is not available! The preload script may not have loaded correctly.'
    );
    // Display error message
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error: Backend API not available</h1>
        <p>The preload script failed to expose the API. Check the console for errors.</p>
        <p>Expected window.backend to be available.</p>
      </div>
    `;
    return;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Render the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
