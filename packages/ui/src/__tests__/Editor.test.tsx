import React from 'react';
import { render, screen } from './test-utils';
import { Editor } from '../components/Editor';

describe('Editor', () => {
  it('renders the editor layout', () => {
    render(<Editor />);
    
    // Check for main sections
    expect(screen.getByText('Frames')).toBeInTheDocument();
  });

  it('shows empty state when no frames exist', () => {
    render(<Editor />);
    
    expect(screen.getByText('No frames yet')).toBeInTheDocument();
    expect(screen.getByText('Use the Add tool to create frames')).toBeInTheDocument();
  });

  it('disables save button when no frames exist', () => {
    render(<Editor />);
    
    // The save button shows "Save All" when no frames are selected
    const saveButton = screen.getByText('Save All');
    
    expect(saveButton).toBeDisabled();
  });
}); 