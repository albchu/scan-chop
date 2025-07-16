import React, { useCallback } from 'react';
import { useWorkspaceStore } from '../../stores';
import { PathInputCompact } from './PathInputCompact';

interface AppBarProps {
  // Add props as needed in the future
}

export const AppBar: React.FC<AppBarProps> = () => {
  // Workspace store subscriptions
  const currentDirectory = useWorkspaceStore((state) => state.currentDirectory);
  const loadDirectory = useWorkspaceStore((state) => state.loadDirectory);
  const refreshDirectory = useWorkspaceStore((state) => state.refreshDirectory);

  const handlePathChange = useCallback(
    async (path: string) => {
      console.log('[AppBar] handlePathChange:', path);
      await loadDirectory(path);
    },
    [loadDirectory]
  );

  const handleRefresh = useCallback(async () => {
    console.log('[AppBar] Refreshing current directory');
    await refreshDirectory();
  }, [refreshDirectory]);

  return (
    <header
      className="w-full bg-gray-950 flex items-center px-4 h-14"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Logo/Title */}
        <h1 className="text-xl font-semibold text-white mt-17 z-10 select-none">
          Scan Chop
        </h1>

        {/* Path Input in center */}
        <div
          className="flex-1 max-w-lg mx-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <PathInputCompact
            currentPath={currentDirectory || ''}
            onPathChange={handlePathChange}
            onRefresh={handleRefresh}
            onPathValidation={(isValid, error) => {
              if (!isValid && error) {
                console.log('[AppBar] Path validation error:', error);
              }
            }}
          />
        </div>

        {/* Right side actions can be added here */}
      </div>
    </header>
  );
};
