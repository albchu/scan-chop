import React, { useState, useRef, useEffect } from 'react';
import { SubmitButton } from './SubmitButton';

interface PathInputProps {
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

export const PathInput: React.FC<PathInputProps> = ({
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

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
    return 'w-full px-3 py-2 bg-gray-800 border-0 text-gray-100 placeholder-gray-400 focus:outline-none';
  };

  // Determine if we're in search mode (input differs from last validated path)
  const isSearchMode = inputValue.trim() !== lastValidatedPath;

  const getContainerClassName = () => {
    const baseClass = 'flex gap-0 flex-1 rounded-md overflow-hidden border';
    
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
    <div className="space-y-2 flex-col gap-2">
      <label className="block text-sm font-medium text-gray-200 pb-1">
        Directory
      </label>

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

        <SubmitButton
          isSearchMode={isSearchMode}
          isValidating={isValidating}
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
        />
      </div>

      {validationState.error && (
        <p className="text-sm text-red-500 mt-1">{validationState.error}</p>
      )}
    </div>
  );
};
