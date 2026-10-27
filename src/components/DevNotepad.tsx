import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { captureDevNote } from '@/lib/devNoteCapture';
import { canSaveNote, devNoteRpc, DRAFT_KEY, isNoteDev, NOTE_BUTTONS, NOTE_OPEN, noteButtonsOn, notepadFocused, notePayload, readNoteContext, readNoteStorage, writeNoteStorage, type DevNote, type NoteContext } from '@/lib/devNotes';
import './dev-notepad.css';

export default function DevNotepad() {
  const { user } = useAuth(); const { pathname } = useLocation();
  const [allowedUser, setAllowedUser] = useState<string | null>(null);
  useEffect(() => {
    setAllowedUser(null); if (!user) return;
    let cancelled = false;
    void supabase.from('users').select('registration_number').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (!cancelled && !error && isNoteDev(data?.registration_number)) setAllowedUser(user.id);
    });
    return () => { cancelled = true; };
  }, [user?.id]);
  if (!user || allowedUser !== user.id || ['/login', '/signup', '/'].includes(pathname)) return null;
  return <DevNotepadPanel key={user.id} route={pathname} />;
}

export function DevNotepadPanel({ route }: { route: string }) {
  const [open, setOpen] = useState(false), [buttons, setButtons] = useState(noteButtonsOn);
  const [draft, setDraft] = useState(() => readNoteStorage(DRAFT_KEY));
  const [shot, setShot] = useState<{ shot: string; thumb: string }>();
  const [shotContext, setShotContext] = useState<{ route: string; context: NoteContext }>();
  const [context, setContext] = useState<NoteContext>({});
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  const [edit, setEdit] = useState<{ id: number | string; note: string }>();
  const textarea = useRef<HTMLTextAreaElement>(null), lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [viewport, setViewport] = useState({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });
  const refresh = useCallback(async () => {
    try { setNotes(await devNoteRpc<DevNote[]>('dev_notes_list', { p_limit: 15 }) ?? []); }
    catch { setFeedback('Could not load notes.'); }
  }, []);
  const snap = useCallback(async () => {
    if (lock.current) return; lock.current = true; setBusy(true);
    const ctx = readNoteContext();
    try { const image = await captureDevNote(); setShot(image); setShotContext({ route, context: ctx }); setFeedback(''); }
    catch { setFeedback('Screenshot failed. You can still save text.'); }
    finally { lock.current = false; setBusy(false); setOpen(true); }
  }, [route]);
  const save = useCallback(async () => {
    if (lock.current || !canSaveNote(draft, shot?.shot)) return; lock.current = true; setBusy(true);
    try {
      const id = await devNoteRpc<number | string>('dev_note_add', notePayload(draft, shotContext?.route ?? route, shotContext?.context ?? readNoteContext(), shot));
      setDraft(''); writeNoteStorage(DRAFT_KEY, ''); setShot(undefined); setShotContext(undefined); setFeedback(`Saved #${id}`);
      if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setFeedback(''), 2000);
      void refresh(); textarea.current?.focus({ preventScroll: true });
    } catch { setFeedback('Could not save. Your draft is still here.'); }
    finally { lock.current = false; setBusy(false); }
  }, [draft, shot, shotContext, route, refresh]);
  useEffect(() => {
    const show = () => setOpen(true), visibility = () => setButtons(noteButtonsOn());
    window.addEventListener(NOTE_OPEN, show); window.addEventListener(NOTE_BUTTONS, visibility);
    return () => { window.removeEventListener(NOTE_OPEN, show); window.removeEventListener(NOTE_BUTTONS, visibility); if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (!open) return; textarea.current?.focus({ preventScroll: true }); void refresh(); setContext(readNoteContext());
    const interval = setInterval(() => setContext(readNoteContext()), 1000); return () => clearInterval(interval);
  }, [open, refresh]);
  useEffect(() => {
    const update = () => setViewport({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });
    window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, []);
  useEffect(() => {
    const focus = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-dev-notepad]')) return;
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ']) window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    };
    const pointer = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || e.target.closest('[data-dev-notepad]')) return;
      if (notepadFocused() && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    const keyboard = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setOpen(false); return; }
      if (!notepadFocused()) return; e.stopImmediatePropagation();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!edit) void save(); }
    };
    window.addEventListener('focusin', focus, true); window.addEventListener('pointerdown', pointer, true); window.addEventListener('keydown', keyboard, true);
    return () => { window.removeEventListener('focusin', focus, true); window.removeEventListener('pointerdown', pointer, true); window.removeEventListener('keydown', keyboard, true); };
  }, [open, save, edit]);
  const place = (r: string, c: { x?: number | null; y?: number | null; layer?: number | null; era?: string | null; maze_level?: number; player_cell?: { col: number; row: number } }) => [r, c.player_cell ? `L${c.maze_level} · ${c.player_cell.col},${c.player_cell.row}` : c.x != null ? `${c.x},${c.y}` : null, c.layer == null ? null : c.layer === 1 ? 'underground' : 'surface', c.era].filter(Boolean).join(' · ');
  const drop = async (id: number | string) => { if (lock.current) return; lock.current = true; setBusy(true); try { await devNoteRpc('dev_note_drop', { p_id: id }); setNotes(rows => rows.filter(n => n.id !== id)); } catch { setFeedback('Could not remove note.'); } finally { lock.current = false; setBusy(false); } };
  const saveEdit = async () => { if (!edit || lock.current) return; lock.current = true; setBusy(true); try { await devNoteRpc('dev_note_edit', { p_id: edit.id, p_note: edit.note }); setEdit(undefined); void refresh(); } catch { setFeedback('Could not edit note.'); } finally { lock.current = false; setBusy(false); } };
  return createPortal(<>
    {buttons && !open && <div className="dev-note-buttons font-mono" data-dev-notepad data-no-thumbstick onClick={e => e.stopPropagation()}><Button variant="outline" title="Open dev notepad" aria-label="Open dev notepad" onClick={() => setOpen(true)}>✎</Button><Button variant="outline" title="Screenshot and note" aria-label="Screenshot and note" disabled={busy} onClick={() => void snap()}>◉</Button></div>}
    {open && <section role="dialog" aria-label="Dev notepad" tabIndex={-1} className="dev-notepad font-mono" data-dev-notepad data-no-thumbstick style={{ height: viewport.height * .52, bottom: window.innerHeight - viewport.height - viewport.top }} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <div className="dev-note-context">{place(shotContext?.route ?? route, shotContext?.context ?? context)} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="dev-note-compose"><textarea ref={textarea} aria-label="Dev note" value={draft} onChange={e => { setDraft(e.target.value); writeNoteStorage(DRAFT_KEY, e.target.value); }} />{shot && <div className="dev-note-attachment"><img src={shot.thumb} alt="Attached screenshot" /><Button variant="ghost" aria-label="Remove screenshot" disabled={busy} onClick={() => { setShot(undefined); setShotContext(undefined); }}>✕</Button></div>}</div>
      <div className="dev-note-actions"><Button variant="outline" disabled={busy} onClick={() => void snap()}>◉ SNAP</Button><Button variant="outline" disabled={busy || !canSaveNote(draft, shot?.shot)} onClick={() => void save()}>SAVE</Button><Button variant="outline" onClick={() => setOpen(false)}>CLOSE</Button></div>
      <p role="status" className="dev-note-feedback">{feedback}</p>
      <div className="dev-note-list">{notes.map(n => <article key={n.id} className="dev-note-item"><div><time>{new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><div className="dev-note-place">{place(n.route, n)}</div>{n.thumb && <img src={n.thumb} alt={`Screenshot for note ${n.id}`} />}{edit?.id === n.id ? <><textarea autoFocus className="dev-note-edit" aria-label="Edit note" value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })} /><div className="dev-note-actions"><Button disabled={busy} onClick={() => void saveEdit()}>SAVE EDIT</Button><Button onClick={() => setEdit(undefined)}>CANCEL</Button></div></> : <Button variant="ghost" className="dev-note-text" aria-label={`Edit note ${n.id}`} onClick={() => setEdit({ id: n.id, note: n.note })}>{n.note || '◉'}</Button>}{n.claude_note && <p className="dev-note-reply">{n.claude_note}</p>}</div><Button variant="ghost" aria-label={`Drop note ${n.id}`} disabled={busy} onClick={() => void drop(n.id)}>✕</Button></article>)}</div>
    </section>}
  </>, document.body);
}
