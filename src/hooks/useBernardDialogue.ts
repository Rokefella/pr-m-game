// Back-compat shim — the real implementation lives in useNpcDialogue.ts.
export * from './useNpcDialogue';
import { useNpcDialogue, type UseNpcDialogueOptions } from './useNpcDialogue';

/** @deprecated use useNpcDialogue('bernard', options) */
export const useBernardDialogue = (options: UseNpcDialogueOptions) =>
  useNpcDialogue('bernard', options);

export default useBernardDialogue;
