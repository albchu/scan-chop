import React, { useState, useRef, useEffect } from 'react';
import { IconRefresh, IconSearch } from '@tabler/icons-react';

interface PathInputCompactProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onPathValidation: (isValid: boolean, error?: string) => void;
  onRefresh?: () => void;
}

// TODO: replace with actual validation. For now is barebones.
const validatePath = async (path: string): Promise<{isValid: boolean; error?: string}> => {
  if (!path || path.trim() === '') {
    return { isValid: false, error: 'Path cannot be empty' };
  }
  
  if (!path.startsWith('/')) {
    return { isValid: false, error: 'Path must be absolute (start with /)' };
  }

  return { isValid: true };
};

export const PathInputCompact: React.FC<PathInputCompactProps> = ({
  currentPath,
  onPathChange,
  onPathValidation,
  onRefresh,
}) => {
  const [inputValue, setInputValue] = useState(currentPath);
  const [lastValidatedPath, setLastValidatedPath] = useState(currentPath);
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean | null;
    error?: string;
  }>({ isValid: null });

  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when currentPath prop changes
  useEffect(() => {
    setInputValue(currentPath);
    setLastValidatedPath(currentPath);
  }, [currentPath]);

  const validatePathAsync = async (path: string) => {
    if (!path.trim()) {
      setValidationState({
        isValid: false,
        error: 'Please enter a directory path',
      });
      onPathValidation(false, 'Please enter a directory path');
      return;
    }

    setIsValidating(true);

    try {
      const result = await validatePath(path.trim());

      setValidationState({
        isValid: result.isValid,
        error: result.error,
      });

      onPathValidation(result.isValid, result.error);

      if (result.isValid) {
        setLastValidatedPath(path.trim());
        onPathChange(path.trim());
      }
    } catch (error) {
      console.error('Path validation failed:', error);
      const errorMessage = 'Failed to validate path';
      setValidationState({ isValid: false, error: errorMessage });
      onPathValidation(false, errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear validation state when typing
    if (validationState.error) {
      setValidationState({ isValid: null });
    }
  };

  const handleSubmit = () => {
    // If we're not in search mode and have a refresh handler, refresh instead
    if (!isSearchMode && onRefresh) {
      onRefresh();
    } else {
      validatePathAsync(inputValue);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getInputClassName = () => {
    return 'w-full px-3 py-1 bg-gray-800 border-0 text-sm text-gray-100 placeholder-gray-400 focus:outline-none';
  };

  // Determine if we're in search mode (input differs from last validated path)
  const isSearchMode = inputValue.trim() !== lastValidatedPath;

  const getContainerClassName = () => {
    const baseClass = 'flex gap-0 flex-1 rounded-md overflow-hidden border h-8';
    
    if (
      validationState.isValid === true &&
      inputValue.trim() === lastValidatedPath
    ) {
      return `${baseClass} border-green-500`;
    }
    
    if (validationState.isValid === false) {
      return `${baseClass} border-red-500`;
    }
    
    return `${baseClass} border-gray-600`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className={getContainerClassName()}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter directory path..."
          className={getInputClassName()}
        />

        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isValidating}
          className={`px-3 flex items-center justify-center transition-colors ${
            isSearchMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          } ${
            (!inputValue.trim() || isValidating) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={isSearchMode ? 'Search' : 'Refresh'}
        >
          {isValidating ? (
            <IconRefresh size={16} className="animate-spin" />
          ) : isSearchMode ? (
            <IconSearch size={16} />
          ) : (
            <IconRefresh size={16} />
          )}
        </button>
      </div>

      {validationState.error && (
        <p className="text-xs text-red-400">{validationState.error}</p>
      )}
    </div>
  );
}; 