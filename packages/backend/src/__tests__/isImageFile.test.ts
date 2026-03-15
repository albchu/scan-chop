import { describe, it, expect } from 'vitest';
import { isImageFile } from '../utils/isImageFile';

describe('isImageFile', () => {
  it('should recognize all supported extensions', () => {
    const supported = [
      '/path/to/file.jpg',
      '/path/to/file.jpeg',
      '/path/to/file.png',
      '/path/to/file.gif',
      '/path/to/file.bmp',
      '/path/to/file.webp',
      '/path/to/file.svg',
      '/path/to/file.tiff',
      '/path/to/file.tif',
    ];

    for (const filePath of supported) {
      expect(
        isImageFile(filePath),
        `expected ${filePath} to be recognized`
      ).toBe(true);
    }
  });

  it('should match extensions case-insensitively', () => {
    expect(isImageFile('/path/photo.PNG')).toBe(true);
    expect(isImageFile('/path/photo.Jpg')).toBe(true);
    expect(isImageFile('/path/photo.TIFF')).toBe(true);
    expect(isImageFile('/path/photo.JpEg')).toBe(true);
  });

  it('should reject non-image extensions', () => {
    expect(isImageFile('/path/doc.pdf')).toBe(false);
    expect(isImageFile('/path/readme.txt')).toBe(false);
    expect(isImageFile('/path/app.js')).toBe(false);
    expect(isImageFile('/path/report.doc')).toBe(false);
  });

  it('should return false for paths with no extension', () => {
    expect(isImageFile('/path/to/file')).toBe(false);
  });

  it('should return false for dotfiles without a real extension', () => {
    expect(isImageFile('.gitignore')).toBe(false);
  });

  it('should use the last extension for multi-dot filenames', () => {
    expect(isImageFile('photo.backup.png')).toBe(true);
    expect(isImageFile('photo.png.txt')).toBe(false);
  });

  it('should return false for empty string input', () => {
    expect(isImageFile('')).toBe(false);
  });
});
