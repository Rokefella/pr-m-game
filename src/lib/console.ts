export const CONSOLE_ROOM_KEY = 'console_room';
export const CONSOLE_ROOM_LEVEL = 1;
export type RiftTarget = 'amber' | 'teal' | 'purple';
export type ConsoleResult =
  | { ok: true; rift: RiftTarget; already?: boolean }
  | { ok: false; reason: 'wrong'; attempts_left: number }
  | { ok: false; reason: 'locked'; retry_in_seconds: number }
  | { ok: false; reason: 'no_key' | 'silent' | 'not_signed_in' };

export function consoleLevel(value: string | null): number {
  const level = Number(value);
  return Number.isInteger(level) && level > 0 ? level : 1;
}