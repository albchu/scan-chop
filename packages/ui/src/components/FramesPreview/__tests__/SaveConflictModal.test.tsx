import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaveConflictModal } from '../SaveConflictModal';
import type { FrameData } from '@workspace/shared';

const makeFrame = (id: string, label: string): FrameData => ({
  id,
  label,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  orientation: 0,
  pageId: 'page-1',
  imageData: 'data:image/png;base64,test',
});

const defaultProps = {
  isOpen: true,
  frames: [makeFrame('f1', 'Photo 1'), makeFrame('f2', 'Photo 2')],
  directory: '/output',
  existingFiles: [] as string[],
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

describe('SaveConflictModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SaveConflictModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders file inputs for each frame when open', async () => {
    render(<SaveConflictModal {...defaultProps} />);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);
    });
  });

  it('sanitizes filenames from frame labels', async () => {
    render(<SaveConflictModal {...defaultProps} />);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      // "Photo 1" -> "Photo_1.png"
      expect(inputs[0].value).toBe('Photo_1.png');
      expect(inputs[1].value).toBe('Photo_2.png');
    });
  });

  it('detects external file conflicts', async () => {
    render(
      <SaveConflictModal {...defaultProps} existingFiles={['Photo_1.png']} />
    );

    await waitFor(() => {
      // Both the warning banner ("will overwrite existing files") and per-row badge ("Will overwrite") appear
      const allMatches = screen.getAllByText(/will overwrite/i);
      expect(allMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('detects internal duplicate conflicts', async () => {
    const frames = [makeFrame('f1', 'Same Name'), makeFrame('f2', 'Same Name')];
    render(<SaveConflictModal {...defaultProps} frames={frames} />);

    await waitFor(() => {
      const overwrites = screen.getAllByText(/will overwrite/i);
      // Banner text + 2 per-row badges = at least 2 matches
      expect(overwrites.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows no conflict indicators when filenames are unique', async () => {
    render(<SaveConflictModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryAllByText(/will overwrite/i)).toHaveLength(0);
    });
  });

  it('enforces .png extension on filename change', async () => {
    render(<SaveConflictModal {...defaultProps} />);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: 'newname.jpg' } });
    });

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(inputs[0].value).toBe('newname.png');
    });
  });

  it('calls onConfirm with current filenames', async () => {
    const onConfirm = vi.fn();
    render(<SaveConflictModal {...defaultProps} onConfirm={onConfirm} />);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onConfirm).toHaveBeenCalledWith(['Photo_1.png', 'Photo_2.png']);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<SaveConflictModal {...defaultProps} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });
});
