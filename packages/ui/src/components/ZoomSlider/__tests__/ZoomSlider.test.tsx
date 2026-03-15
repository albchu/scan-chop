import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomSlider } from '../ZoomSlider';

describe('ZoomSlider', () => {
  it('displays "Fit" at zoom 100', () => {
    render(<ZoomSlider zoom={100} onZoomChange={vi.fn()} />);
    expect(screen.getByText('Fit')).toBeInTheDocument();
  });

  it('displays percentage at other zoom levels', () => {
    render(<ZoomSlider zoom={150} onZoomChange={vi.fn()} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('calls onZoomChange with incremented value on zoom in', () => {
    const onChange = vi.fn();
    render(<ZoomSlider zoom={100} onZoomChange={onChange} />);

    fireEvent.click(screen.getByTitle('Zoom In'));

    expect(onChange).toHaveBeenCalledWith(110);
  });

  it('calls onZoomChange with decremented value on zoom out', () => {
    const onChange = vi.fn();
    render(<ZoomSlider zoom={100} onZoomChange={onChange} />);

    fireEvent.click(screen.getByTitle('Zoom Out'));

    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('disables zoom in at maximum (400)', () => {
    render(<ZoomSlider zoom={400} onZoomChange={vi.fn()} />);

    const zoomInBtn = screen.getByTitle('Zoom In');
    expect(zoomInBtn).toBeDisabled();
  });

  it('disables zoom out at minimum (25)', () => {
    render(<ZoomSlider zoom={25} onZoomChange={vi.fn()} />);

    const zoomOutBtn = screen.getByTitle('Zoom Out');
    expect(zoomOutBtn).toBeDisabled();
  });

  it('calls onZoomChange(100) and onReset on reset button click', () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(<ZoomSlider zoom={200} onZoomChange={onChange} onReset={onReset} />);

    fireEvent.click(screen.getByTitle('Reset Zoom & Pan (Fit to viewport)'));

    expect(onChange).toHaveBeenCalledWith(100);
    expect(onReset).toHaveBeenCalled();
  });
});
