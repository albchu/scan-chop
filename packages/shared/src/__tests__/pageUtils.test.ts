import { describe, expect, it } from 'vitest';
import { generatePageId } from '../utils/pageUtils';

describe('generatePageId', () => {
  it('should be deterministic — same path returns same ID', () => {
    const path = '/Users/alice/photos/scan001.png';
    const first = generatePageId(path);
    const second = generatePageId(path);
    expect(first).toBe(second);
  });

  it('should produce different IDs for different paths', () => {
    const idA = generatePageId('/foo/a.png');
    const idB = generatePageId('/foo/b.png');
    expect(idA).not.toBe(idB);
  });

  it('should return an ID matching the expected format', () => {
    const id = generatePageId('/some/path/image.jpg');
    expect(id).toMatch(/^page-[0-9a-f]+$/);
  });

  it('should return "page-0" for an empty string', () => {
    expect(generatePageId('')).toBe('page-0');
  });

  it('should produce valid IDs for paths with special characters', () => {
    const paths = [
      '/path with spaces/file name.png',
      '/dots...many/file..png',
      '/slashes///nested///deep.jpg',
      '/ünïcödé/画像/ファイル.png',
    ];

    for (const p of paths) {
      const id = generatePageId(p);
      expect(id).toMatch(/^page-[0-9a-f]+$/);
    }
  });

  it('should handle very long paths without throwing', () => {
    const longPath = 'a'.repeat(10000);
    expect(() => generatePageId(longPath)).not.toThrow();
    expect(generatePageId(longPath)).toMatch(/^page-[0-9a-f]+$/);
  });

  it('should be case-sensitive', () => {
    const upper = generatePageId('/Foo/Bar.png');
    const lower = generatePageId('/foo/bar.png');
    expect(upper).not.toBe(lower);
  });
});
