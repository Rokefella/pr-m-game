import { expect, it, vi } from 'vitest';
const client = vi.hoisted(() => {
  const c: { self: unknown; rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: null }> } = {
    self: null,
    rpc(fn: string) { c.self = this; return Promise.resolve({ data: fn === 'my_praems' ? [] : null, error: null }); },
  };
  return c;
});
vi.mock('@/lib/supabase', () => ({ supabase: client }));
vi.mock('./supabase', () => ({ supabase: client }));
it('Præm rpc helper calls the client with the client as `this`', async () => {
  const { myPraems } = await import('./praems');
  await myPraems();
  expect(client.self).toBe(client);
});
