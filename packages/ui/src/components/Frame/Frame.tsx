import React, { useCallback, useRef, useState, useMemo } from 'react';
import Moveable, {
  OnDrag,
  OnResize,
  OnRotate,
  OnDragStart,
  OnDragEnd,
} from 'react-moveable';
import { FrameData } from '@workspace/shared';
import { useZoomContext } from '../../context/ZoomContext';
import { useUIContext } from '../../context/UIContext';
import { FrameInfo } from './FrameInfo';
import {
  createTransformString,
  calculateMoveableZoom,
  addGrabbingCursor,
  removeGrabbingCursor,
  RENDER_DIRECTIONS,
} from './frameUtils';
import { workspaceApi } from '../../api/workspace';
import { debounce } from 'lodash';
import styles from './Frame.module.css';

interface FrameProps {
  frame: FrameData;
  updateFrame: (id: string, updates: Partial<FrameData>) => void;
}

// TODO: Might need to debounce updateFrame later if rendering gets chuggy with a lot of frames. Lez find out.
export const Frame: React.FC<FrameProps> = ({ frame, updateFrame }) => {
  // The frame position, size, and rotation can be initialized from frame data but frame data
  // cannot actively drive the moveable component because the moveable component is driving
  // and needs instant UI feedback to drive the experience.
  const {
    id,
    label,
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
    rotation: initialRotation,
    orientation,
  } = frame;

  // Get page context for scaling
  const { page } = useUIContext();

  // Get zoom context and calculate moveable zoom
  const { totalScale } = useZoomContext();
  const moveableZoom = useMemo(
    () => calculateMoveableZoom(totalScale),
    [totalScale]
  );

  // TODO: Figure out parity with features I want from frame.
  // Control panel can be mostly removed as I move to finalize that design. Is just metadata I need to show on a list.
  // The list can have different view types.

  const targetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    createTransformString(initialX, initialY, initialRotation)
  );
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [rotation, setRotation] = useState(initialRotation);

  // Debounced backend sync
  const syncToBackend = useMemo(
    () => debounce(async (frameId: string, updates: Partial<FrameData>) => {
      try {
        // Scale coordinates to original image space before syncing
        const scaleX = (page.originalWidth || page.width) / page.width;
        const scaleY = (page.originalHeight || page.height) / page.height;
        
        const scaledUpdates = { ...updates };
        if (updates.x !== undefined) scaledUpdates.x = updates.x * scaleX;
        if (updates.y !== undefined) scaledUpdates.y = updates.y * scaleY;
        if (updates.width !== undefined) scaledUpdates.width = updates.width * scaleX;
        if (updates.height !== undefined) scaledUpdates.height = updates.height * scaleY;
        
        await workspaceApi.updateFrame(frameId, scaledUpdates);
        console.log(`[Frame] Synced frame ${frameId} to backend`);
      } catch (error) {
        console.error(`[Frame] Failed to sync frame ${frameId} to backend:`, error);
      }
    }, 500),
    [page]
  );

  const handleDragStart = useCallback(({ target }: OnDragStart) => {
    if (target) {
      addGrabbingCursor(target as HTMLElement);
    }
  }, []);

  const handleDrag = useCallback(
    ({ target, transform, translate, width, height }: OnDrag) => {
      if (target && transform) {
        target.style.transform = transform;
        const [x, y] = translate;
        setTransform(transform);
        
        // Update local state immediately
        updateFrame(id, { x, y, width, height });
        
        // Sync to backend (debounced)
        syncToBackend(id, { x, y, width, height });
      }
    },
    [id, updateFrame, syncToBackend]
  );

  const handleDragEnd = useCallback(({ target }: OnDragEnd) => {
    if (target) {
      removeGrabbingCursor(target as HTMLElement);
    }
  }, []);

  const handleResize = useCallback(
    ({ target, width, height, drag }: OnResize) => {
      if (target && width !== undefined && height !== undefined) {
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
        target.style.transform = drag.transform;
        const [x, y] = drag.translate;

        setSize({ width, height });
        setTransform(drag.transform);
        
        // Update local state immediately
        updateFrame(id, { x, y, width, height });
        
        // Sync to backend (debounced)
        syncToBackend(id, { x, y, width, height });
      }
    },
    [id, updateFrame, syncToBackend]
  );

  const handleRotate = useCallback(
    ({ target, transform, rotation }: OnRotate) => {
      if (target && transform) {
        target.style.transform = transform;

        setTransform(transform);
        if (rotation !== undefined) {
          setRotation(rotation);
          
          // Update local state immediately
          updateFrame(id, { rotation });
          
          // Sync to backend (debounced)
          syncToBackend(id, { rotation });
        }
      }
    },
    [id, updateFrame, syncToBackend]
  );

  return (
    <>
      <div
        ref={targetRef}
        className="absolute rounded-lg cursor-grab"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: transform,
          transformOrigin: 'center center',
        }}
        data-frame-id={id}
      >
        <FrameInfo
          label={label}
          width={size.width}
          height={size.height}
          orientation={orientation}
          moveableZoom={moveableZoom}
        />
      </div>

      <Moveable
        zoom={moveableZoom}
        target={targetRef}
        container={null}
        // Enable basic abilities
        draggable={true}
        resizable={true}
        rotatable={true}
        // Keep ratio during resize
        keepRatio={false}
        // Show all resize handles
        renderDirections={RENDER_DIRECTIONS}
        // Event handlers
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onResize={handleResize}
        onRotate={handleRotate}
        // Styling
        origin={true}
        edge={true}
        className={styles.moveableFrame}
      />
    </>
  );
};
