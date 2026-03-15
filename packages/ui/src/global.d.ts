// Global type declarations

interface Window {
  backend: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    send: (channel: string, ...args: unknown[]) => void;
  };
}
