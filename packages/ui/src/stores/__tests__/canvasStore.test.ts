import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';

describe('canvasStore', () => {
  beforeEach(() => {
    // Merge-reset state fields without wiping action functions
    useCanvasStore.setState({
      zoom: 100,
      panOffset: { x: 0, y: 0 },
      canvasSize: { width: 0, height: 0 },
      baseScale: 1,
      totalScale: 1,
    });
  });

  // ── setZoom ───────────────────────────────────────────────────────
  describe('setZoom', () => {
    it('sets zoom and recomputes totalScale', () => {
      useCanvasStore.setState({ baseScale: 0.5 });

      useCanvasStore.getState().setZoom(200);

      const state = useCanvasStore.getState();
      expect(state.zoom).toBe(200);
      expect(state.totalScale).toBeCloseTo(0.5 * (200 / 100)); // 1.0
    });

    it('accepts values without bounds enforcement', () => {
      useCanvasStore.getState().setZoom(-50);
      expect(useCanvasStore.getState().zoom).toBe(-50);

      useCanvasStore.getState().setZoom(10000);
      expect(useCanvasStore.getState().zoom).toBe(10000);
    });
  });

  // ── updateScales ──────────────────────────────────────────────────
  describe('updateScales', () => {
    it('computes correct baseScale with padding', () => {
      useCanvasStore.setState({
        canvasSize: { width: 1100, height: 900 },
      });

      useCanvasStore.getState().updateScales(2000, 1600);

      const state = useCanvasStore.getState();
      // scaleX = (1100 - 100) / 2000 = 0.5
      // scaleY = (900 - 100) / 1600  = 0.5
      // baseScale = min(0.5, 0.5, 1) = 0.5
      expect(state.baseScale).toBeCloseTo(0.5);
      expect(state.totalScale).toBeCloseTo(0.5);
    });

    it('caps baseScale at 1.0 for small images', () => {
      useCanvasStore.setState({
        canvasSize: { width: 1000, height: 1000 },
      });

      // Small image that would scale above 1.0
      useCanvasStore.getState().updateScales(100, 100);

      expect(useCanvasStore.getState().baseScale).toBe(1);
    });

    it('falls back to baseScale=1 when canvas size is missing', () => {
      useCanvasStore.setState({ canvasSize: { width: 0, height: 0 } });

      useCanvasStore.getState().updateScales(1000, 800);

      expect(useCanvasStore.getState().baseScale).toBe(1);
    });

    it('falls back to baseScale=1 when page dimensions are missing', () => {
      useCanvasStore.setState({ canvasSize: { width: 1000, height: 800 } });

      useCanvasStore.getState().updateScales(undefined, undefined);

      expect(useCanvasStore.getState().baseScale).toBe(1);
    });

    it('falls back when page dimensions are zero', () => {
      useCanvasStore.setState({ canvasSize: { width: 1000, height: 800 } });

      useCanvasStore.getState().updateScales(0, 0);

      expect(useCanvasStore.getState().baseScale).toBe(1);
    });

    it('totalScale reflects current zoom after updateScales', () => {
      useCanvasStore.setState({
        canvasSize: { width: 1100, height: 900 },
        zoom: 200,
      });

      useCanvasStore.getState().updateScales(2000, 1600);

      // baseScale = 0.5, totalScale = 0.5 * (200/100) = 1.0
      expect(useCanvasStore.getState().totalScale).toBeCloseTo(1.0);
    });
  });

  // ── resetView ─────────────────────────────────────────────────────
  describe('resetView', () => {
    it('resets zoom and pan while preserving baseScale', () => {
      useCanvasStore.setState({
        zoom: 250,
        panOffset: { x: 100, y: -50 },
        baseScale: 0.5,
        totalScale: 1.25,
      });

      useCanvasStore.getState().resetView();

      const state = useCanvasStore.getState();
      expect(state.zoom).toBe(100);
      expect(state.panOffset).toEqual({ x: 0, y: 0 });
      expect(state.totalScale).toBe(0.5); // baseScale * 1
    });
  });

  // ── setPanOffset / setCanvasSize ──────────────────────────────────
  describe('setPanOffset', () => {
    it('stores the pan offset', () => {
      useCanvasStore.getState().setPanOffset({ x: 42, y: -17 });
      expect(useCanvasStore.getState().panOffset).toEqual({ x: 42, y: -17 });
    });
  });

  describe('setCanvasSize', () => {
    it('stores the canvas size', () => {
      useCanvasStore.getState().setCanvasSize({ width: 800, height: 600 });
      expect(useCanvasStore.getState().canvasSize).toEqual({
        width: 800,
        height: 600,
      });
    });
  });
});
