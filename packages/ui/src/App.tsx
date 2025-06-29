import React from 'react';
import { Editor } from './components/Editor';

export function App() {
  return <Editor />;
}

/* Legacy App component - kept for reference
import React from 'react';
import { useReactiveSelector } from './hooks/useReactiveSelector';
import { useBackend } from './hooks/useBackend';

export function App() {
  const counter = useReactiveSelector('counter');
  const backend = useBackend();

  const handleIncrement = () => {
    backend.dispatch({ type: 'incrementCounter' });
  };

  const handleReset = () => {
    backend.dispatch({ type: 'resetApp' });
  };

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
              <h1>🖼️ Scan Chop</h1>
      <p>Counter value: <strong>{counter}</strong></p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={handleIncrement}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Increment (+1)
        </button>
        
        <button 
          onClick={handleReset}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
        <p><strong>Architecture Demo:</strong></p>
        <p>This UI dispatches actions to the backend and reactively updates when state changes.</p>
        <p>The same React code runs in both Electron and Web with different backend implementations!</p>
      </div>
    </div>
  );
}
*/ 