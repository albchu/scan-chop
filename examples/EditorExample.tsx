import React from 'react';
import { Editor } from '../components/Editor';

/**
 * Example of using the Editor component
 * 
 * To use this in your app:
 * 1. Import the CSS: import '@workspace/ui/dist/styles/index.css';
 * 2. Import this component or the Editor directly
 * 
 * Note: To see frames on an actual image, you'll need to modify the initial
 * state in UIContext.tsx to include a base64 image in page.imageData
 */
export const EditorExample: React.FC = () => {
  // In a real app, you might load an image and convert it to base64
  // For now, the Editor uses a gray background as placeholder
  
  return (
    <div className="h-screen">
      <Editor />
    </div>
  );
};

// Example of how to convert an image to base64 (for reference)
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}; 