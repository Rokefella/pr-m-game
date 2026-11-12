import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlateFrame from '@/components/theme/PlateFrame';
import DropIcon from '@/components/DropIcon';
import { supabase } from '@/lib/supabase';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import type { ConsoleResult, ConsoleState } from '@/lib/console';
import { inventoryChanged } from '@/lib/inventoryEvents';
import { PRAEMS_CHANGED, praemTone, unlockPraemAudio } from '@/lib/praems';

const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
type Props = { open: boolean; level: number; onClose: () => void };
export default memo(function ConsolePanel({ open, level, onClose }: Props) {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [terms, setTerms] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [shake, setShake] = useState(false);
  const [reward, setReward] = useState<Extract<ConsoleResult, { ok: true }> | null>(null);
  const generation = useRef(0);
  const checking = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const version = ++generation.current;
    checking.current = false;
    setState(null); setTerms([]); setMessage(''); setReward(null); setShake(false);
    setDeadline(0); setSeconds(0); setBusy(open);
    if (!open) return;
    const previous = document.activeElement;
    const load = async () => {
      setBusy(true);
      try {
        const { data, error } = await rpc('console_state', { p_level: level });
        if (version !== generation.current) return;
        if (error || !data) throw error ?? new Error('No signal');
        const next = data as ConsoleState;
        if (!next.ok) {
          if (next.reason === 'silent') { setState(null); closeRef.current(); }
          else throw new Error('No signal');
          return;
        }
        setState(next);
        setTerms([...(next.primes ?? [])].sort((a, b) => a - b));
        setMessage('');
        const remaining = next.locked ? Math.max(0, next.retry_in_seconds) : 0;
        setSeconds(remaining);
        setDeadline(remaining ? Date.now() + remaining * 1000 : 0);
      } catch { if (version === generation.current) setMessage('No signal. Try again.'); }
      finally { if (version === generation.current) setBusy(false); }
    };
    refreshRef.current = load;
    void load();
    return () => { generation.current++; if (previous instanceof HTMLElement) previous.focus(); };
  }, [open, level]);

  useEffect(() => { if (open && (state || message)) dialog.current?.focus(); }, [open, state, message]);
  useEffect(() => {
    if (!deadline || !open) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (!left) { setDeadline(0); void refreshRef.current(); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, open]);
  useEffect(() => {
    if (!reward) return;
    const id = setTimeout(() => closeRef.current(), 4500);
    return () => clearTimeout(id);
  }, [reward]);
  useEffect(() => {
    if (!shake) return;
    const id = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(id);
  }, [shake]);

  const speak = async () => {
    if (!state || state.done || !state.has_key || state.have < state.need || state.locked || !state.key_drop_id || busy || checking.current || reward) return;
    unlockPraemAudio();
    checking.current = true; setBusy(true); setMessage('');
    const version = generation.current;
    try {
      const { data, error } = await rpc('console_praem', { p_level: level, p_terms: terms, p_drop_id: state.key_drop_id });
      // Persisted successes refresh inventories even if the card closed while waiting.
      const result = data as ConsoleResult | null;
      if (!error && result?.ok) { inventoryChanged(); window.dispatchEvent(new Event(PRAEMS_CHANGED)); }
      if (version !== generation.current) return;
      if (error || !result) throw error ?? new Error('No signal');
      if (result.ok === true) { setReward(result); praemTone(true); return; }
      switch (result.reason) {
        case 'wrong':
          setShake(true);
          if (result.attempts_left === 0) {
            await refreshRef.current();
            if (version !== generation.current) return;
            setState(current => current ? { ...current, locked: true } : current);
          } else setMessage(`Not that. ${result.attempts_left ?? state.attempts_left} left.`);
          break;
        case 'locked': {
          setState(current => current ? { ...current, locked: true } : current);
          if (result.retry_in_seconds == null) await refreshRef.current();
          else { setSeconds(result.retry_in_seconds); setDeadline(Date.now() + result.retry_in_seconds * 1000); }
          break;
        }
        case 'missing_fragments':
          await refreshRef.current();
          if (version !== generation.current) return;
          setState(current => current ? { ...current, reason: 'missing_fragments' } : current);
          break;
        case 'no_key': setState(current => current ? { ...current, has_key: false, key_drop_id: null } : current); break;
        case 'done': setState(current => current ? { ...current, done: true } : current); break;
        case 'silent': setState(null); closeRef.current(); break;
        default: setMessage('No signal. Try again.');
      }
    } catch { if (version === generation.current) setMessage('No signal. Try again.'); }
    finally { if (version === generation.current) { checking.current = false; setBusy(false); } }
  };
  if (!open || (!state && !message)) return null;
  const locked = state?.locked ?? false;
  const puzzle = state && !state.done && state.has_key && state.have >= state.need && state.reason !== 'missing_fragments' && !locked;
  const line = message || (state?.done ? 'It has nothing more to give.' : locked ? `It has gone quiet. Try again in ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : !state?.has_key ? "It wants something you don't have yet." : state.have < state.need || state.reason === 'missing_fragments' ? 'Something is still missing in here.' : '');
  return createPortal(<div className="console-layer" data-game-ui="open">
    <div className="console-backdrop" onClick={onClose} aria-hidden="true" />
    <PlateFrame width="min(100vw, 420px)" className="console-sheet" glow={DIMENSION_GLOW.teal}>
      <span className="console-rivets" aria-hidden="true">{['tl', 'tr', 'bl', 'br'].map(corner => <i key={corner} className={`console-rivet-${corner}`} />)}</span>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="The Instrument" className="console-stack" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') onClose();
        if (event.key === 'Tab') {
          const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          const first = controls?.[0], last = controls?.[controls.length - 1];
          if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
            event.preventDefault(); (event.shiftKey ? last : first).focus();
          }
        }
      }}>
        <header><h2 className="font-cinzel">THE INSTRUMENT</h2><Button variant="ghost" className="console-close" aria-label="Close Instrument" onClick={onClose}><X /></Button></header>
        {reward ? <div className="console-praem-reveal" role="status">
          <div className="console-praem-rise"><div className="console-praem-lit"><DropIcon svg={reward.icon_lit ?? reward.icon_svg} size={96} /></div><div className="console-praem-sleep"><DropIcon svg={reward.icon_svg} size={96} /></div></div>
          <p className="font-fell">{reward.praem} — it sleeps. Carry it home to the Shadow Realm.</p>
        </div> : <>
          {state && !state.done && <div className={`console-display console-target font-cinzel ${!state.has_key ? 'console-target-dim' : ''}`} aria-label={`Target: ${state.target}`}><strong>{String(state.target).replace('-', '−')}</strong></div>}
          <div className="console-message" role="status"><p className="font-fell italic">{line}</p>{state && !state.done && !state.has_key && <span className="font-mono">Key: {state.key_name}</span>}{state && !state.done && state.has_key && state.have < state.need && <span className="font-mono">{state.have} / {state.need}</span>}</div>
          {state && !state.done && state.has_key && <div className={`console-primes ${shake ? 'console-primes-shake' : ''}`} aria-label="Fragments">
            {terms.map((term, i) => <Button key={Math.abs(term)} variant="outline" className="console-prime font-mono" aria-label={`${term < 0 ? 'Minus' : 'Plus'} ${Math.abs(term)}`} aria-pressed={term < 0} disabled={!puzzle || busy} onClick={() => setTerms(current => current.map((value, index) => index === i ? -value : value))}><span aria-hidden="true">{term < 0 ? '−' : '+'}</span>{Math.abs(term)}</Button>)}
          </div>}
          {puzzle && <Button className="auth-submit font-cinzel" disabled={busy || !state?.key_drop_id} onClick={() => void speak()}>Speak</Button>}
          {!state && message && <Button className="auth-submit font-cinzel" disabled={busy} onClick={() => void refreshRef.current()}>Retry</Button>}
        </>}
      </div>
    </PlateFrame>
  </div>, document.body);
});
