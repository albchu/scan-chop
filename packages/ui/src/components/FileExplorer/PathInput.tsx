import React, { useState, useRef, useEffect } from 'react';
import { validatePath } from './mockFileSystem';
import { IconCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';

interface PathInputProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onPathValidation: (isValid: boolean, error?: string) => void;
}

export const PathInput: React.FC<PathInputProps> = ({
  currentPath,
  onPathChange,
  onPathValidation
}) => {
  const [inputValue, setInputValue] = useState(currentPath);
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean | null;
    error?: string;
  }>({ isValid: null });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update input value when currentPath prop changes
  useEffect(() => {
    setInputValue(currentPath);
  }, [currentPath]);

  const validatePathAsync = async (path: string) => {
    if (!path.trim()) {
      setValidationState({ isValid: false, error: 'Please enter a directory path' });
      onPathValidation(false, 'Please enter a directory path');
      return;
    }

    // Store current focus state
    const hadFocus = inputRef.current === document.activeElement;
    
    setIsValidating(true);
    
    try {
      const result = await validatePath(path.trim());
      
      setValidationState({
        isValid: result.isValid,
        error: result.error
      });
      
      onPathValidation(result.isValid, result.error);
      
      if (result.isValid) {
        onPathChange(path.trim());
      }
    } catch (error) {
      console.error('Path validation failed:', error);
      const errorMessage = 'Failed to validate path';
      setValidationState({ isValid: false, error: errorMessage });
      onPathValidation(false, errorMessage);
    } finally {
      setIsValidating(false);
      
      // Restore focus if the input had focus before validation
      if (hadFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear previous validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Reset validation state while typing
    setValidationState({ isValid: null });
    
    // Debounce validation - validate after user stops typing for 800ms
    validationTimeoutRef.current = setTimeout(() => {
      validatePathAsync(newValue);
    }, 800);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Clear debounced validation and validate immediately
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      validatePathAsync(inputValue);
    }
    
    // Handle Cmd+A (Mac) and Ctrl+A (Windows/Linux) to select all text
    if ((e.metaKey && e.key === 'a') || (e.ctrlKey && e.key === 'a')) {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.select();
      }
      return;
    }
    
    // Handle Cmd+V (Mac) and Ctrl+V (Windows/Linux) with feature detection
    if ((e.metaKey && e.key === 'v') || (e.ctrlKey && e.key === 'v')) {
      e.preventDefault(); // Prevent default to handle it ourselves
      
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.warn('Clipboard API not available');
        // Don't prevent default, let browser handle paste normally
        return;
      }
      
      try {
        // Read from clipboard
        const clipboardText = await navigator.clipboard.readText();
        console.log('Clipboard content:', clipboardText);
        
        // Update input value
        setInputValue(clipboardText);
        
        // Clear any pending validation
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        
        // Reset validation state
        setValidationState({ isValid: null });
        
        // Validate immediately
        validatePathAsync(clipboardText);
        
        // Keep focus on the input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } catch (error) {
        console.error('Failed to read clipboard:', error);
        // Show user-friendly message if needed
        if (error instanceof Error && error.name === 'NotAllowedError') {
          console.info('Clipboard access denied. Please use standard paste.');
        }
      }
    }
  };

  const handleBlur = () => {
    // Only validate on blur if there's actually a value and it's different from current path
    if (inputValue.trim() && inputValue.trim() !== currentPath) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      validatePathAsync(inputValue);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const getValidationIcon = () => {
    if (isValidating) {
      return <IconLoader2 size={20} className="animate-spin text-gray-300" />;
    }
    
    if (validationState.isValid === true) {
      return <IconCheck size={20} className="text-green-500" />;
    }
    
    if (validationState.isValid === false) {
      return <IconAlertCircle size={20} className="text-red-500" />;
    }
    
    return null;
  };

  const getInputClassName = () => {
    const baseClass = 'w-full px-3 py-2 pr-10 bg-gray-800 border rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    
    if (validationState.isValid === true) {
      return `${baseClass} border-green-500`;
    }
    
    if (validationState.isValid === false) {
      return `${baseClass} border-red-500`;
    }
    
    return `${baseClass} border-gray-600`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        Directory Path
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Enter directory path..."
          className={getInputClassName()}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getValidationIcon()}
        </div>
      </div>
      
      {validationState.error && (
        <p className="text-sm text-red-500 mt-1">
          {validationState.error}
        </p>
      )}
      
      {validationState.isValid === true && (
        <p className="text-sm text-green-500 mt-1">
          Directory is valid and accessible
        </p>
      )}
    </div>
  );
}; 