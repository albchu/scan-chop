import React, { useMemo } from 'react';
import { useUIContext } from '../context/UIContext';
import { Page } from './Page';
import { DEFAULT_FRAME_SIZE_RATIO } from '@workspace/shared';

export const Canvas: React.FC = () => {
  const { mode, page, addFrame, selectFrame, clearSelection } = useUIContext();

  const [defaultFrameWidth, defaultFrameHeight] = useMemo(() => {
    return [
      page.width * DEFAULT_FRAME_SIZE_RATIO,
      page.height * DEFAULT_FRAME_SIZE_RATIO,
    ];
  }, [page]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // TODO: Might be good if all clicks on the page will directly put us into add frame mode and add a frame.
    // Check if we clicked on a frame
    const target = e.target as HTMLElement;
    const frameElement = target.closest('[data-frame-id]');

    if (frameElement) {
      const frameId = frameElement.getAttribute('data-frame-id');
      if (mode === 'select' && frameId) {
        selectFrame(frameId);
      }
    } else if (target.closest('[data-page="true"]')) {
      // Clicked on page background
      if (mode === 'add') {
        const pageElement = target.closest('[data-page="true"]') as HTMLElement;
        const rect = pageElement.getBoundingClientRect();
        
        // Add frame at click position with default size
        // Container coordinates in html start at top left corner.
        // UX should feel better if the frame origin is spawned at the click position instead of top left corner.
        // Thats why we subtract half the frame size from the click position.
        // TODO: Control panel might need to add the frame size to the click position to trick UI into thinking the origin offset is the truth.
        const x = e.clientX - rect.left - defaultFrameWidth / 2;
        const y = e.clientY - rect.top - defaultFrameHeight / 2;

        addFrame({
          x,
          y,
          width: defaultFrameWidth,
          height: defaultFrameHeight,
          rotation: 0,
        });
      } else if (mode === 'select') {
        clearSelection();
      }
    }
  };

  return (
    <div
      className={`
        h-full bg-gray-700 flex items-center justify-center overflow-auto
        ${mode === 'add' ? 'cursor-crosshair' : 'cursor-default'}
      `}
      onClick={handleCanvasClick}
    >
      <Page />
    </div>
  );
};
