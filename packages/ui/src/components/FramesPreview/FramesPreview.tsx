import React, { useState, useCallback } from 'react';
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import { useUIStore } from '../../stores';
import { FramesGrid } from './FramesGrid';
import { GridSizeControls } from './GridSizeControls';
import { SaveConflictModal } from './SaveConflictModal';
import { workspaceApi } from '../../api/workspace';
import type { FrameData } from '@workspace/shared';

export const FramesPreview: React.FC = () => {
  const gridColumnWidth = useUIStore((state) => state.gridColumnWidth);
  const setGridColumnWidth = useUIStore((state) => state.setGridColumnWidth);
  const framesByPage = useUIStore((state) => state.framesByPage);
  const clearAllFrames = useUIStore((state) => state.clearAllFrames);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get all frames from all pages
  const allFrames = Object.values(framesByPage).flat();
  const hasFrames = allFrames.length > 0;

  const sanitizeFilename = (label: string): string => {
    const sanitized = label
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .trim() || 'frame';
    return `${sanitized}.png`;
  };

  const handleSaveAll = useCallback(async () => {
    if (!hasFrames) return;

    try {
      // Open directory picker
      const directory = await workspaceApi.selectDirectory();
      if (!directory) return; // User cancelled

      // Generate filenames from frame labels
      const filenames = allFrames.map((frame) => sanitizeFilename(frame.label));

      // Check for existing files
      const existing = await workspaceApi.checkFilesExist(directory, filenames);

      setSelectedDirectory(directory);
      setExistingFiles(existing);
      setIsModalOpen(true);
    } catch (error) {
      console.error('[FramesPreview] Error preparing save:', error);
    }
  }, [allFrames, hasFrames]);

  const handleModalCancel = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDirectory('');
    setExistingFiles([]);
  }, []);

  const handleModalConfirm = useCallback(async (filenames: string[]) => {
    setIsSaving(true);
    try {
      const result = await workspaceApi.saveAllFrames(
        selectedDirectory,
        allFrames,
        filenames
      );

      console.log('[FramesPreview] Save result:', result);
      
      if (result.errors.length > 0) {
        console.error('[FramesPreview] Some files failed to save:', result.errors);
      }

      setIsModalOpen(false);
      setSelectedDirectory('');
      setExistingFiles([]);
    } catch (error) {
      console.error('[FramesPreview] Error saving frames:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedDirectory, allFrames]);

  const handleClearAll = useCallback(() => {
    if (!hasFrames) return;
    clearAllFrames();
  }, [hasFrames, clearAllFrames]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with Grid Controls */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Frames</h2>
        <GridSizeControls 
          value={gridColumnWidth}
          onChange={setGridColumnWidth}
        />
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <button
          onClick={handleSaveAll}
          disabled={!hasFrames || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <IconDeviceFloppy className="w-4 h-4" />
          Save All
        </button>
        <button
          onClick={handleClearAll}
          disabled={!hasFrames}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
        >
          <IconTrash className="w-4 h-4" />
          Clear All
        </button>
      </div>
      
      {/* Frames Grid */}
      <FramesGrid />

      {/* Save Conflict Modal */}
      <SaveConflictModal
        isOpen={isModalOpen}
        frames={allFrames}
        directory={selectedDirectory}
        existingFiles={existingFiles}
        onCancel={handleModalCancel}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}; 