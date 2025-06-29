import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Editor } from '../components/Editor';

describe('Editor', () => {
  it('renders the editor layout', () => {
    render(<Editor />);
    
    // Check for main sections
    expect(screen.getByTitle('Select Tool')).toBeInTheDocument();
    expect(screen.getByTitle('Add Frame Tool')).toBeInTheDocument();
    expect(screen.getByText('Frames')).toBeInTheDocument();
  });

  it('switches between tools', () => {
    render(<Editor />);
    
    const selectTool = screen.getByTitle('Select Tool');
    const addTool = screen.getByTitle('Add Frame Tool');
    
    // Default should be select tool
    expect(selectTool).toHaveClass('bg-blue-600');
    expect(addTool).toHaveClass('bg-gray-700');
    
    // Click add tool
    fireEvent.click(addTool);
    
    expect(selectTool).toHaveClass('bg-gray-700');
    expect(addTool).toHaveClass('bg-blue-600');
  });

  it('shows empty state when no frames exist', () => {
    render(<Editor />);
    
    expect(screen.getByText('No frames yet')).toBeInTheDocument();
    expect(screen.getByText('Use the Add tool to create frames')).toBeInTheDocument();
  });

  it('disables undo/redo when no history', () => {
    render(<Editor />);
    
    const undoButton = screen.getByTitle('Nothing to undo');
    const redoButton = screen.getByTitle('Nothing to redo');
    
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
  });

  it('disables batch controls when no frames', () => {
    render(<Editor />);
    
    const saveButton = screen.getByText('Save All Frames');
    const removeButton = screen.getByText('Remove Selected');
    
    expect(saveButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });
}); 