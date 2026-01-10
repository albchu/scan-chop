import { useState, useEffect } from 'react';

interface KeyboardModifiers {
  isCommandPressed: boolean;
  isShiftPressed: boolean;
  isAltPressed: boolean;
}

export const useKeyboardModifiers = (): KeyboardModifiers => {
  const [isCommandPressed, setIsCommandPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsCommandPressed(true);
      }
      if (e.shiftKey) {
        setIsShiftPressed(true);
      }
      if (e.altKey) {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandPressed(false);
      }
      if (!e.shiftKey) {
        setIsShiftPressed(false);
      }
      if (!e.altKey) {
        setIsAltPressed(false);
      }
    };

    // Handle when window loses focus
    const handleBlur = () => {
      setIsCommandPressed(false);
      setIsShiftPressed(false);
      setIsAltPressed(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    isCommandPressed,
    isShiftPressed,
    isAltPressed,
  };
}; 