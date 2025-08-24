import React from 'react';

interface ActionButtonProps {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
}) => {
  const variantClasses = variant === 'danger' 
    ? 'hover:bg-red-600/80 hover:text-red-200'
    : 'hover:bg-gray-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        action-button p-3 rounded-lg transition-all duration-200
        ${disabled 
          ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' 
          : `bg-gray-800/80 text-gray-300 ${variantClasses}`
        }
        flex items-center justify-center
      `}
      title={label}
    >
      {icon}
    </button>
  );
};
