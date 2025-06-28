export interface AppState extends Record<string, any> {
  counter: number;
}

export type Action =
  | { type: 'incrementCounter' }
  | { type: 'resetApp' }; 