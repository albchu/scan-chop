import React, { useState, useRef, useEffect } from 'react';

interface EditableLabelProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const EditableLabel: React.FC<EditableLabelProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== value) {
      onChange(editValue.trim());
    } else {
      setEditValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`px-1 py-0 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-700 px-1 rounded transition-colors ${className}`}
    >
      {value}
    </span>
  );
};
