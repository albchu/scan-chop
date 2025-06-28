import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider, App } from '@workspace/ui';
import { WebBackendProvider, useWebBackendContext } from '@workspace/backend-web';

// Component that bridges the web backend to the UI
function AppWithWebBackend() {
  const backend = useWebBackendContext();
  
  return (
    <AppProvider backend={backend}>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WebBackendProvider>
      <AppWithWebBackend />
    </WebBackendProvider>
  </React.StrictMode>
); 