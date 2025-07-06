import React, { useState } from 'react';
import { IconLoader2, IconSearch, IconRefresh } from '@tabler/icons-react';

interface SubmitButtonProps {
  isSearchMode: boolean;
  isValidating: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  isSearchMode, 
  isValidating, 
  onClick, 
  disabled 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getIcon = () => {
    if (isValidating) {
      return <IconLoader2 size={18} className="animate-spin" />;
    }
    return isSearchMode ? <IconSearch size={18} /> : <IconRefresh size={18} />;
  };
  
  const getTooltipText = () => {
    if (isValidating) return 'Validating...';
    return isSearchMode ? 'Search directory' : 'Refresh directory';
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isValidating}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          h-full px-3 transition-colors duration-150
          ${disabled || isValidating 
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white cursor-pointer'
          }
        `}
      >
        {getIcon()}
      </button>
      
      {/* Tooltip */}
      {showTooltip && !isValidating && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap pointer-events-none z-10">
          {getTooltipText()}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}; 