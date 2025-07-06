import React from 'react';
import { 
  IconLayoutSidebarLeftCollapse, 
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand
} from '@tabler/icons-react';

interface DividerButtonProps {
  side: 'left' | 'right';
  isCollapsed: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

export const DividerButton: React.FC<DividerButtonProps> = ({ 
  side, 
  isCollapsed, 
  onClick,
  isDragging = false
}) => {
  const getIcon = () => {
    if (side === 'left') {
      return isCollapsed ? (
        <IconLayoutSidebarLeftExpand size={16} />
      ) : (
        <IconLayoutSidebarLeftCollapse size={16} />
      );
    } else {
      return isCollapsed ? (
        <IconLayoutSidebarRightExpand size={16} />
      ) : (
        <IconLayoutSidebarRightCollapse size={16} />
      );
    }
  };

  // Adjust button position when collapsed to prevent clipping
  const getPositionStyles = () => {
    if (isCollapsed) {
      // When collapsed, offset the button to stay within viewport
      // For right side, we need to offset from the right edge more
      return side === 'left' 
        ? 'left-1' // Small offset from left edge
        : 'right-2'; // Larger offset from right edge to prevent clipping
    }
    // When not collapsed, center on the divider
    return 'left-1/2 -translate-x-1/2';
  };

  return (
    <button
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className={`
        absolute top-1/2 -translate-y-1/2
        ${getPositionStyles()}
        w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 
        flex items-center justify-center
        text-gray-300 hover:text-white
        transition-all duration-150
        z-10
        ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
      aria-label={isCollapsed ? `Expand ${side} panel` : `Collapse ${side} panel`}
    >
      {getIcon()}
    </button>
  );
}; 