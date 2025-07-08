import { Editor } from './components/Editor';
import { BackendProvider } from './context/BackendContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import type { BackendAPI } from '@workspace/shared';

export function App({ backend }: { backend: BackendAPI }) {
  return (
    <BackendProvider value={backend}>
      <WorkspaceProvider>
        <Editor />
      </WorkspaceProvider>
    </BackendProvider>
  );
}
