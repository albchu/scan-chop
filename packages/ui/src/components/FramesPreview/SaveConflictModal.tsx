import React, { useState, useEffect, useCallback } from 'react';
import { IconX, IconAlertTriangle } from '@tabler/icons-react';
import type { FrameData } from '@workspace/shared';

interface FileMapping {
  frameId: string;
  originalFilename: string;
  currentFilename: string;
  hasConflict: boolean;
}

interface SaveConflictModalProps {
  isOpen: boolean;
  frames: FrameData[];
  directory: string;
  existingFiles: string[];
  onCancel: () => void;
  onConfirm: (filenames: string[]) => void;
}

export const SaveConflictModal: React.FC<SaveConflictModalProps> = ({
  isOpen,
  frames,
  directory,
  existingFiles,
  onCancel,
  onConfirm,
}) => {
  const [fileMappings, setFileMappings] = useState<FileMapping[]>([]);

  // Initialize file mappings when modal opens
  useEffect(() => {
    if (isOpen && frames.length > 0) {
      const initialMappings = frames.map((frame) => {
        const filename = sanitizeFilename(frame.label);
        return {
          frameId: frame.id,
          originalFilename: filename,
          currentFilename: filename,
          hasConflict: false, // Will be calculated below
        };
      });
      
      // Calculate conflicts (external + internal duplicates)
      const filenameCounts = new Map<string, number>();
      initialMappings.forEach((m) => {
        filenameCounts.set(m.currentFilename, (filenameCounts.get(m.currentFilename) || 0) + 1);
      });
      
      const mappingsWithConflicts = initialMappings.map((mapping) => ({
        ...mapping,
        hasConflict: 
          existingFiles.includes(mapping.currentFilename) || 
          (filenameCounts.get(mapping.currentFilename) || 0) > 1,
      }));
      
      setFileMappings(mappingsWithConflicts);
    }
  }, [isOpen, frames, existingFiles]);

  const sanitizeFilename = (label: string): string => {
    const sanitized = label
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .trim() || 'frame';
    return `${sanitized}.png`;
  };

  const handleFilenameChange = useCallback((frameId: string, newFilename: string) => {
    setFileMappings((prev) => {
      // First pass: update the changed filename
      const updated = prev.map((mapping) => {
        if (mapping.frameId !== frameId) return mapping;
        
        // Ensure .png extension
        let filename = newFilename;
        if (!filename.toLowerCase().endsWith('.png')) {
          filename = filename.replace(/\.[^/.]+$/, '') + '.png';
        }
        
        return { ...mapping, currentFilename: filename };
      });
      
      // Second pass: recalculate conflicts for ALL rows (external + internal duplicates)
      const filenameCounts = new Map<string, number>();
      updated.forEach((m) => {
        filenameCounts.set(m.currentFilename, (filenameCounts.get(m.currentFilename) || 0) + 1);
      });
      
      return updated.map((mapping) => ({
        ...mapping,
        hasConflict: 
          existingFiles.includes(mapping.currentFilename) || 
          (filenameCounts.get(mapping.currentFilename) || 0) > 1,
      }));
    });
  }, [existingFiles]);

  const conflictCount = fileMappings.filter((m) => m.hasConflict).length;
  const hasConflicts = conflictCount > 0;

  const handleConfirm = () => {
    const filenames = fileMappings.map((m) => m.currentFilename);
    onConfirm(filenames);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {hasConflicts && (
              <IconAlertTriangle className="w-6 h-6 text-amber-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-100">
              {hasConflicts ? 'File Conflicts Detected' : 'Confirm Save'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <IconX className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-400 mb-4">
            Saving {frames.length} frame{frames.length !== 1 ? 's' : ''} to:{' '}
            <span className="text-gray-300 font-mono text-xs">{directory}</span>
          </p>

          {hasConflicts && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-300">
                {conflictCount} file{conflictCount !== 1 ? 's' : ''} will overwrite existing files. 
                Edit the filenames below to resolve conflicts.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {fileMappings.map((mapping) => (
              <div
                key={mapping.frameId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  mapping.hasConflict
                    ? 'bg-amber-900/10 border-amber-700/50'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={mapping.currentFilename}
                    onChange={(e) => handleFilenameChange(mapping.frameId, e.target.value)}
                    className={`w-full px-3 py-2 rounded bg-gray-800 border text-sm font-mono ${
                      mapping.hasConflict
                        ? 'border-amber-600 text-amber-200 focus:border-amber-500'
                        : 'border-gray-600 text-gray-200 focus:border-blue-500'
                    } focus:outline-none transition-colors`}
                  />
                </div>
                {mapping.hasConflict && (
                  <span className="text-xs text-amber-500 whitespace-nowrap">
                    Will overwrite
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              hasConflicts
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {hasConflicts
              ? `Save and overwrite ${conflictCount} file${conflictCount !== 1 ? 's' : ''}`
              : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
