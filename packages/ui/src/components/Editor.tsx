import React from 'react';
import { UIContextProvider } from '../context/UIContext';
import { Canvas } from './Canvas';
import { FramesPreview } from './FramesPreview/FramesPreview';
import { FileExplorer } from './FileExplorer';
import { ThreePanelLayout } from './Layout';
import { WorkspaceExample } from '../examples/WorkspaceExample';

export const Editor: React.FC = () => {
  return (
    <WorkspaceExample />
  )
  const handleFileSelect = (path: string) => {
    console.log('File selected:', path);
  };

  return (
    <UIContextProvider>
      <ThreePanelLayout
        leftPanel={<FileExplorer onFileSelect={handleFileSelect} />}
        rightPanel={<FramesPreview />}
        initialLeftWidth={20}
        initialCenterWidth={60}
        minPanelWidth={10}
      >
        <Canvas />
      </ThreePanelLayout>
    </UIContextProvider>
  );
}; 