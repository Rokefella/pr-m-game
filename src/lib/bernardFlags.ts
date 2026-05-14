// Enforces sequential setting of praem_bernard_XX flags.
// A flag N can only be set when flags 0..N-1 are all 'true'.

export function canSetBernardFlag(flagNumber: number): boolean {
  if (typeof window === 'undefined') return false;
  for (let i = 0; i < flagNumber; i++) {
    const key = `praem_bernard_0${i}`;
    if (window.localStorage.getItem(key) !== 'true') return false;
  }
  return true;
}

export function setBernardFlag(flagNumber: number): boolean {
  if (!canSetBernardFlag(flagNumber)) return false;
  window.localStorage.setItem(`praem_bernard_0${flagNumber}`, 'true');
  return true;
}
