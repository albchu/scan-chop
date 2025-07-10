import { Editor } from './components/Editor';
import { WorkspaceProvider } from './context/WorkspaceContext';

export function App() {
  return (
    <WorkspaceProvider>
      <Editor />
    </WorkspaceProvider>
  );
}
