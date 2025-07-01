import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('disables batch controls when no frames', () => {
    render(<Editor />);
    
    const saveButton = screen.getByText('Save All Frames');
    const removeButton = screen.getByText('Remove Selected');
    
    expect(saveButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });
}); 