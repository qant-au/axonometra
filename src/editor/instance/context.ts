import { createContext, useContext } from 'react';
import type { EditorInstance } from './EditorInstance';

export const EditorInstanceContext = createContext<EditorInstance | null>(null);

/** The editor this component belongs to. */
export function useInstance(): EditorInstance {
  const instance = useContext(EditorInstanceContext);
  if (!instance) {
    throw new Error('Axonometra: render this inside <Axonometra>');
  }
  return instance;
}
