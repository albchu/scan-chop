import React, { useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';

export function WorkspaceExample() {
  const { state, loadDirectory, clearError } = useWorkspace();
  const [inputPath, setInputPath] = useState('');

  const handleLoadDirectory = async () => {
    if (inputPath.trim()) {
      await loadDirectory(inputPath.trim());
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Workspace Loader Example</h1>
      
      {/* Directory Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          placeholder="Enter directory path..."
          style={{
            padding: '8px',
            width: '400px',
            marginRight: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={handleLoadDirectory}
          disabled={state.isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: state.isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {state.isLoading ? 'Loading...' : 'Load Directory'}
        </button>
      </div>

      {/* Error Display */}
      {state.error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={clearError}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Current Directory Info */}
      {state.currentDirectory && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Current Directory: {state.currentDirectory}</h2>
          <p>Found {state.imagePaths.length} images and {state.subdirectories.length} subdirectories</p>
        </div>
      )}

      {/* Subdirectories */}
      {state.subdirectories.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Subdirectories:</h3>
          <ul>
            {state.subdirectories.map((dir) => (
              <li key={dir}>
                <button
                  onClick={() => loadDirectory(dir)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {dir}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Image Grid */}
      {state.loadedImages.size > 0 && (
        <div>
          <h3>Loaded Images:</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {Array.from(state.loadedImages.values()).map((image) => (
              <div
                key={image.path}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <img
                  src={image.dataUrl}
                  alt={image.path}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
                <div style={{ padding: '10px' }}>
                  <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: 'bold' }}>
                    {image.path.split('/').pop()}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                    {image.width} × {image.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 