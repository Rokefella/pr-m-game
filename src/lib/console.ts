export const CONSOLE_ROOM_KEY = 'console_room';
export const CONSOLE_ROOM_LEVEL = 1;
export type RiftTarget = 'amber' | 'teal' | 'purple';
export type ConsoleState = {
  ok: boolean; reason?: string; done: boolean; target: number; primes: number[];
  have: number; need: number; has_key: boolean; key_drop_id: string | null;
  key_name: string; locked: boolean; retry_in_seconds: number; attempts_left: number;
};
export type ConsoleResult =
  | { ok: true; praem: string; description?: string; icon_svg: string | null; icon_lit: string | null }
  | { ok: false; reason: string; attempts_left?: number; retry_in_seconds?: number };

export function consoleLevel(value: string | null): number {
  const level = Number(value);
  return Number.isInteger(level) && level > 0 ? level : 1;
}