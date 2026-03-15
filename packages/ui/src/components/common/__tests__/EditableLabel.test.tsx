import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditableLabel } from '../EditableLabel';

describe('EditableLabel', () => {
  it('renders as a span in display mode', () => {
    render(<EditableLabel value="Test Label" onChange={vi.fn()} />);

    expect(screen.getByText('Test Label').tagName).toBe('SPAN');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('enters edit mode on click', () => {
    render(<EditableLabel value="Test Label" onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('Test Label'));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'Test Label'
    );
  });

  it('calls onChange and exits edit mode on Enter with changed value', () => {
    const onChange = vi.fn();
    render(<EditableLabel value="Original" onChange={onChange} />);

    fireEvent.click(screen.getByText('Original'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'New Value' },
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('New Value');
    // Should be back to span mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not call onChange when value is unchanged', () => {
    const onChange = vi.fn();
    render(<EditableLabel value="Same" onChange={onChange} />);

    fireEvent.click(screen.getByText('Same'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when value is empty and reverts', () => {
    const onChange = vi.fn();
    render(<EditableLabel value="Original" onChange={onChange} />);

    fireEvent.click(screen.getByText('Original'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    // Should revert to displaying original
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('reverts on Escape', () => {
    const onChange = vi.fn();
    render(<EditableLabel value="Original" onChange={onChange} />);

    fireEvent.click(screen.getByText('Original'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Changed' },
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('submits on blur', () => {
    const onChange = vi.fn();
    render(<EditableLabel value="Original" onChange={onChange} />);

    fireEvent.click(screen.getByText('Original'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Blurred' },
    });
    fireEvent.blur(screen.getByRole('textbox'));

    expect(onChange).toHaveBeenCalledWith('Blurred');
  });

  it('stops click propagation', () => {
    const parentHandler = vi.fn();
    render(
      <div onClick={parentHandler}>
        <EditableLabel value="Label" onChange={vi.fn()} />
      </div>
    );

    fireEvent.click(screen.getByText('Label'));

    expect(parentHandler).not.toHaveBeenCalled();
  });
});
