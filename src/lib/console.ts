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
export type DevConsoleAnswer = { ok: true; terms: number[]; target: number } | { ok: false; reason: string };
export const DEV_CONSOLE_ANSWER = 'praem:dev-console-answer';
const answerKey = (level: number) => `praem_dev_console_answer_${level}`;

/** Signed primes as shown to Rob, e.g. "+83 −653 = −570". */
export function formatSignedTerms(terms: number[]): string {
  const sign = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n)}`;
  const sum = terms.reduce((a, b) => a + b, 0);
  return `${terms.map(sign).join(' ')} = ${sum < 0 ? '−' : ''}${Math.abs(sum)}`;
}

/** Remembers the dev answer so the console panel can pre-set its tiles (the player still speaks). */
export function storeDevConsoleAnswer(level: number, terms: number[]) {
  try { sessionStorage.setItem(answerKey(level), JSON.stringify(terms)); } catch { /* quota */ }
  window.dispatchEvent(new CustomEvent(DEV_CONSOLE_ANSWER, { detail: { level, terms } }));
}

export function devConsoleAnswerFor(level: number): number[] | null {
  try { const v = JSON.parse(sessionStorage.getItem(answerKey(level)) ?? 'null'); return Array.isArray(v) ? v.map(Number) : null; } catch { return null; }
}

/** Applies answer signs to the current tiles, keeping their order; null when primes do not match. */
export function applyAnswerSigns(current: number[], answer: number[] | null): number[] | null {
  if (!answer) return null;
  const signs = new Map(answer.map(n => [Math.abs(n), n < 0 ? -1 : 1]));
  if (current.some(n => !signs.has(Math.abs(n)))) return null;
  return current.map(n => Math.abs(n) * signs.get(Math.abs(n))!);
}
