import { describe, it, expect } from 'vitest';
import {
  convertToTreeNode,
  updateNodeByPath,
  flattenTree,
  initializeTree,
} from '../treeUtils';
import type { DirectoryNode } from '@workspace/shared';

const makeDir = (
  name: string,
  path: string,
  children?: DirectoryNode[]
): DirectoryNode => ({
  name,
  path,
  isDirectory: true,
  hasChildren: children ? children.length > 0 : false,
  children,
});

const makeFile = (name: string, path: string): DirectoryNode => ({
  name,
  path,
  isDirectory: false,
});

describe('treeUtils', () => {
  // ── convertToTreeNode ─────────────────────────────────────────────
  describe('convertToTreeNode', () => {
    it('converts a single node with UI defaults', () => {
      const node = makeFile('photo.png', '/photos/photo.png');
      const result = convertToTreeNode(node);

      expect(result.level).toBe(0);
      expect(result.isExpanded).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.name).toBe('photo.png');
    });

    it('recursively converts children with incrementing level', () => {
      const root = makeDir('root', '/root', [
        makeDir('sub', '/root/sub', [
          makeFile('deep.png', '/root/sub/deep.png'),
        ]),
      ]);

      const result = convertToTreeNode(root);

      expect(result.level).toBe(0);
      expect(result.children![0].level).toBe(1);
      expect(result.children![0].children![0].level).toBe(2);
    });

    it('respects custom starting level', () => {
      const node = makeFile('a.png', '/a.png');
      const result = convertToTreeNode(node, 5);

      expect(result.level).toBe(5);
    });
  });

  // ── updateNodeByPath ──────────────────────────────────────────────
  describe('updateNodeByPath', () => {
    it('applies updater to matching node', () => {
      const tree = [convertToTreeNode(makeDir('a', '/a'))];

      const result = updateNodeByPath(tree, '/a', (n) => ({
        ...n,
        isExpanded: true,
      }));

      expect(result[0].isExpanded).toBe(true);
    });

    it('recurses into children to find nested match', () => {
      const root = makeDir('root', '/root', [makeDir('child', '/root/child')]);
      const tree = [convertToTreeNode(root)];

      const result = updateNodeByPath(tree, '/root/child', (n) => ({
        ...n,
        isLoading: true,
      }));

      expect(result[0].children![0].isLoading).toBe(true);
    });

    it('returns unchanged tree when no match found', () => {
      const tree = [convertToTreeNode(makeDir('a', '/a'))];
      const result = updateNodeByPath(tree, '/nonexistent', (n) => ({
        ...n,
        isExpanded: true,
      }));

      expect(result[0].isExpanded).toBe(false);
    });

    it('only updates the target node, leaving siblings alone', () => {
      const tree = [
        convertToTreeNode(makeDir('a', '/a')),
        convertToTreeNode(makeDir('b', '/b')),
      ];

      const result = updateNodeByPath(tree, '/a', (n) => ({
        ...n,
        isExpanded: true,
      }));

      expect(result[0].isExpanded).toBe(true);
      expect(result[1].isExpanded).toBe(false);
    });
  });

  // ── flattenTree ───────────────────────────────────────────────────
  describe('flattenTree', () => {
    it('excludes children of collapsed nodes', () => {
      const parent = {
        ...convertToTreeNode(makeDir('p', '/p', [makeFile('c', '/p/c')])),
        isExpanded: false,
      };
      const result = flattenTree([parent]);

      // Only the parent, not the child
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('p');
    });

    it('includes children of expanded nodes', () => {
      const child = convertToTreeNode(makeFile('c', '/p/c'), 1);
      const parent = {
        ...convertToTreeNode(makeDir('p', '/p', [makeFile('c', '/p/c')])),
        isExpanded: true,
        children: [child],
      };

      const result = flattenTree([parent]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('p');
      expect(result[1].name).toBe('c');
    });

    it('handles mixed expansion states', () => {
      const expanded = {
        ...convertToTreeNode(makeDir('a', '/a', [makeFile('a1', '/a/a1')])),
        isExpanded: true,
        children: [convertToTreeNode(makeFile('a1', '/a/a1'), 1)],
      };
      const collapsed = {
        ...convertToTreeNode(makeDir('b', '/b', [makeFile('b1', '/b/b1')])),
        isExpanded: false,
      };

      const result = flattenTree([expanded, collapsed]);

      expect(result).toHaveLength(3); // a, a1, b
      expect(result.map((n) => n.name)).toEqual(['a', 'a1', 'b']);
    });

    it('returns empty array for empty tree', () => {
      expect(flattenTree([])).toEqual([]);
    });
  });

  // ── initializeTree ────────────────────────────────────────────────
  describe('initializeTree', () => {
    it('returns empty array for null root', () => {
      expect(initializeTree(null)).toEqual([]);
    });

    it('uses children as top-level nodes when root has children', () => {
      const root = makeDir('root', '/root', [
        makeDir('a', '/root/a'),
        makeFile('b.png', '/root/b.png'),
      ]);

      const result = initializeTree(root);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('a');
      expect(result[1].name).toBe('b.png');
    });

    it('wraps root itself when it has no children', () => {
      const root = makeDir('root', '/root');

      const result = initializeTree(root);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('root');
    });
  });
});
