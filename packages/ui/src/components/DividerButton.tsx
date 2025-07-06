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
        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
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