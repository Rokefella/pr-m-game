// Back-compat shim — the real implementation lives in useNpcDialogue.ts.
export * from './useNpcDialogue';
import { useNpcDialogue } from './useNpcDialogue';

/** @deprecated use useNpcDialogue('bernard') */
export const useBernardDialogue = (opts: Parameters<typeof useNpcDialogue>[1] extends undefined ? never : never | Record<string, unknown>) =>
  useNpcDialogue('bernard', opts as never);

export default useBernardDialogue;
