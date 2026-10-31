import { expect, it, vi } from 'vitest';
import { reportIfFailed, SAVE_FAILED_EVENT } from './saveNotice';
it('raises the in-world message for { error } and ok:false, not for success', () => {
  const seen = vi.fn(); window.addEventListener(SAVE_FAILED_EVENT, seen);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(reportIfFailed('a', { error: { message: 'x' } })).toBe(true);
  expect(reportIfFailed('b', { data: { ok: false } })).toBe(true);
  expect(reportIfFailed('c', { data: { ok: true }, error: null })).toBe(false);
  expect(seen).toHaveBeenCalledTimes(2);
});
