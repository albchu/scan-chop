import React from 'react';
import { IconArrowUp } from '@tabler/icons-react';
import { formatSizeDisplay, formatRotationDisplay } from './frameUtils';

interface FrameInfoProps {
  label: string;
  width: number;
  height: number;
  orientation: number;
  moveableZoom: number;
  imageScaleFactor?: number;
}

export const FrameInfo: React.FC<FrameInfoProps> = ({
  label,
  width,
  height,
  orientation,
  moveableZoom,
  imageScaleFactor,
}) => {
  // Keep the info container always in the bottom left corner of the frame
  const getPositioningStyles = (orientation: number, moveableZoom: number) => {
    switch (orientation) {
      case 0:
        return {
          transform: `scale(${moveableZoom}) rotate(${orientation}deg)`,
          transformOrigin: 'bottom left',
          bottom: 0,
          left: 0,
        };
      case 90:
        return {
          transform: `scale(${moveableZoom}) rotate(${orientation}deg) translateY(-100%)`,
          transformOrigin: 'top left',
        };

      case 180:
        return {
          transform: `scale(${moveableZoom}) rotate(${orientation}deg) translate(100%, -100%)`,
          transformOrigin: 'top right',
          right: 0,
          top: 0,
        };
      case 270:
        return {
          transform: `scale(${moveableZoom}) rotate(${orientation}deg) translateX(100%)`,
          transformOrigin: 'bottom right',
          right: 0,
          bottom: 0,
        };
    }

    return {};
  };

  return (
    // The positioning needs a stable backing to orient to.
    <div className="h-full w-full relative">
      {/* The internal positioned info container */}
      <div
        className="absolute flex-col items-center items-baseline gap-2 bg-white p-2"
        style={getPositioningStyles(orientation, moveableZoom)}
      >
        <div className="text-sm font-semibold text-blue-800">{label}</div>

        <div className="text-xs text-blue-600">
          {formatSizeDisplay(width, height, imageScaleFactor)}
        </div>
      </div>
    </div>
  );
};
