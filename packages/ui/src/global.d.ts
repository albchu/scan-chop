// Global type declarations

interface Window {
  backend: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    send: (channel: string, ...args: any[]) => void;
  };
} 