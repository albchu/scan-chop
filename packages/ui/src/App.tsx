import { Toaster } from 'sonner';
import { Editor } from './components/Editor';

export function App() {
  return (
    <>
      <Toaster position="bottom-right" theme="dark" />
      <Editor />
    </>
  );
}
