import { supabase } from '@/lib/supabase';

export const NOTE_OPEN = 'praem:dev-note-open';
export const NOTE_BUTTONS = 'praem:dev-note-buttons';
export const DRAFT_KEY = 'praem_dev_note_draft';
export const BUTTONS_KEY = 'praem_dev_note_buttons';
export type NoteContext = { x?: number; y?: number; layer?: number; era?: string; level?: number; maze_completed_level?: number; steps_remaining?: number; credits?: number; facing?: string; avatar_body?: string | null; maze_level?: number; player_cell?: { col: number; row: number }; open_card?: string | null; phase?: string };
export type DevNote = { id: number | string; created_at: string; note: string; route: string; x: number | null; y: number | null; layer: number | null; era: string | null; has_shot: boolean; thumb: string | null; status: string; claude_note: string | null };
export const isNoteDev = (registration: unknown) => registration === 1;
export const canSaveNote = (text: string, shot?: string) => Boolean(text.trim() || shot);
export function readNoteStorage(key: string, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
export function writeNoteStorage(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Private mode must not disable notes. */ } }
export const noteButtonsOn = () => readNoteStorage(BUTTONS_KEY, 'on') !== 'off';
export function toggleNoteButtons() { const on = !noteButtonsOn(); writeNoteStorage(BUTTONS_KEY, on ? 'on' : 'off'); window.dispatchEvent(new Event(NOTE_BUTTONS)); return on; }
export function notepadFocused() { return Boolean(document.activeElement?.closest('[data-dev-notepad]')); }
export function noteDimensions(width: number, height: number, maxWidth: number) { const w = Math.min(width, maxWidth); return { width: w, height: Math.max(1, Math.round(height * w / width)) }; }
export function notePayload(note: string, route: string, context: NoteContext, shot?: { shot: string; thumb: string }) {
  const now = new Date();
  return { p_note: note, p_route: route, p_x: route === '/world' ? context.x ?? null : null, p_y: route === '/world' ? context.y ?? null : null, p_layer: route === '/world' ? context.layer ?? null : null, p_era: context.era ?? null,
    p_ctx: { ...context, viewport: { width: window.innerWidth, height: window.innerHeight }, devicePixelRatio: window.devicePixelRatio, user_agent: navigator.userAgent, app_build: import.meta.env.VITE_APP_BUILD ?? import.meta.env.VITE_COMMIT_SHA ?? null, local_time: now.toString(), captured_at: now.toISOString() }, p_thumb: shot?.thumb ?? '', p_shot: shot?.shot ?? '' };
}
export async function devNoteRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

// Getters read current refs only when needed, never subscribe the camera loop to React.
let currentContext: (() => NoteContext) | null = null;
export function registerNoteContext(getter: () => NoteContext) { currentContext = getter; return () => { if (currentContext === getter) currentContext = null; }; }
export function readNoteContext(): NoteContext { return Object.fromEntries(Object.entries(currentContext?.() ?? {}).filter(([, value]) => value !== undefined)) as NoteContext; }