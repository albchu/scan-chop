import React, { createContext, useContext, useRef } from 'react';
import type Moveable from 'react-moveable';

// Context for managing Moveable refs for each frame
const FrameRefRegistryContext = createContext<React.MutableRefObject<Record<string, Moveable | null>> | null>(null);

export const FrameRefRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frameRefs = useRef<Record<string, Moveable | null>>({});
  
  return (
    <FrameRefRegistryContext.Provider value={frameRefs}>
      {children}
    </FrameRefRegistryContext.Provider>
  );
};

export const useFrameRefRegistry = () => {
  const context = useContext(FrameRefRegistryContext);
  if (!context) {
    throw new Error('useFrameRefRegistry must be used within a FrameRefRegistryProvider');
  }
  return context;
}; 