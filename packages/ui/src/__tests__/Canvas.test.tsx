import React from 'react';
import { render, screen } from './test-utils';
import { Canvas } from '../components/Canvas';
import { UIContextProvider } from '../context/UIContext';

describe('Canvas', () => {
  const renderCanvas = () => {
    return render(
      <UIContextProvider>
        <Canvas />
      </UIContextProvider>
    );
  };

  it('renders the canvas component', () => {
    const { container } = renderCanvas();
    
    // Canvas should render with a page area
    const pageElement = container.querySelector('[data-page="true"]');
    expect(pageElement).toBeInTheDocument();
  });

  it('shows empty state when no image is loaded', () => {
    renderCanvas();
    
    expect(screen.getByText('No image loaded')).toBeInTheDocument();
    expect(screen.getByText('Select an image from the file explorer')).toBeInTheDocument();
  });

  it('renders zoom controls', () => {
    renderCanvas();
    
    // Check for zoom controls by looking for the reset button with title
    const resetButton = screen.getByTitle('Reset Zoom & Pan (Fit to viewport)');
    expect(resetButton).toBeInTheDocument();
    
    // Check for zoom in/out buttons
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
  });
}); 