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

// Debug logging
console.log('Renderer starting...');
console.log('Window:', window);
console.log('Window.api:', window.api);
console.log('Window.api.workspace:', window.api?.workspace);

// Wait for window.api to be available
function renderApp() {
  if (!window.api) {
    console.error('window.api is not available! The preload script may not have loaded correctly.');
    // Display error message
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error: Backend API not available</h1>
        <p>The preload script failed to expose the API. Check the console for errors.</p>
      </div>
    `;
    return;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProvider backend={window.api}>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
}

// Render the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
