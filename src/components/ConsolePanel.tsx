import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlateFrame from '@/components/theme/PlateFrame';
import { TransitionFlash } from '@/components/theme/transition/DoorTransition';
import { supabase } from '@/lib/supabase';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import type { ConsoleResult, RiftTarget } from '@/lib/console';

type Props = { open: boolean; level: number; onClose: () => void; onRift: (target: RiftTarget) => void };
export default memo(function ConsolePanel({ open, level, onClose, onRift }: Props) {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('');
  const [tries, setTries] = useState<number | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [target, setTarget] = useState<RiftTarget | null>(null);
  const [flash, setFlash] = useState<RiftTarget | null>(null);
  const generation = useRef(0);
  const checking = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const version = ++generation.current;
    checking.current = false;
    if (!open) return;
    setDigits(''); setMessage(''); setTone(''); setTries(null); setDeadline(0); setSeconds(0);
    setUnlocked(false); setTarget(null); setFlash(null); setBusy(true);
    const previous = document.activeElement;
    dialog.current?.focus();
    void (async () => {
      try {
        const { data, error } = await supabase.from('console_unlocks' as never).select('level_number').eq('level_number', level).maybeSingle();
        if (version !== generation.current) return;
        if (error) throw error;
        if (data) {
          setUnlocked(true); setMessage('The rift is open.');
          const result = await supabase.rpc('use_console' as never, { p_level: level, p_code: '0' } as never);
          if (version !== generation.current) return;
          const answer = result.data as unknown as ConsoleResult | null;
          if (result.error || !answer?.ok) throw result.error ?? new Error('No signal');
          setTarget(answer.rift);
        }
      } catch {
        if (version === generation.current) { setMessage('No signal. Try again.'); setTone('error'); }
      } finally { if (version === generation.current) setBusy(false); }
    })();
    return () => {
      generation.current++;
      clearTimeout(timer.current);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, level]);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (!left) { setDeadline(0); setMessage(''); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const enter = async () => {
    if (!digits || busy || deadline || checking.current) return;
    checking.current = true; setBusy(true); setTries(null);
    const version = generation.current;
    try {
      const { data, error } = await supabase.rpc('use_console' as never, { p_level: level, p_code: digits } as never);
      if (version !== generation.current) return;
      const result = data as unknown as ConsoleResult | null;
      if (error || !result) throw error ?? new Error('No signal');
      if (result.ok) {
        setFlash(result.rift);
        timer.current = setTimeout(() => {
          if (version === generation.current) { setFlash(null); onRift(result.rift); }
        }, 500);
        return;
      }
      setTone('error');
      switch (result.reason) {
        case 'wrong': setMessage('The Instrument does not answer.'); setTries(result.attempts_left); setDigits(''); break;
        case 'locked': setMessage('The console is locked.'); setSeconds(result.retry_in_seconds); setDeadline(Date.now() + result.retry_in_seconds * 1000); break;
        case 'no_key': setMessage('The code is right. A key is missing.'); setTone('gold'); break;
        case 'silent': setMessage('The Instrument is silent.'); setTone(''); break;
        default: setMessage('No signal. Try again.');
      }
    } catch { if (version === generation.current) { setMessage('No signal. Try again.'); setTone('error'); } }
    finally { if (version === generation.current) { checking.current = false; setBusy(false); } }
  };
  if (!open) return null;
  const disabled = busy || seconds > 0 || flash !== null;
  return createPortal(<div className="console-layer">
    <div className="console-backdrop" onClick={onClose} aria-hidden="true" />
    <PlateFrame width="min(100vw, 420px)" className="console-sheet" glow={DIMENSION_GLOW.teal}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="The console" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') onClose();
        if (event.key === 'Tab') {
          const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          const first = controls?.[0], last = controls?.[controls.length - 1];
          if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
            event.preventDefault(); (event.shiftKey ? last : first).focus();
          }
        }
      }} className="console-stack">
        <header><h2 className="font-cinzel">THE CONSOLE</h2><p className="font-mono">Level {level}</p><Button variant="ghost" className="console-close" aria-label="Close console" onClick={onClose}><X /></Button></header>
        <div className={`console-display font-mono ${digits.length > 8 ? 'console-small-slots' : ''}`} aria-label={`Code: ${digits || 'empty'}`}>
          {Array.from({ length: Math.max(5, digits.length) }, (_, i) => <span key={i} className={digits[i] ? '' : 'console-empty'}>{digits[i] ?? ''}</span>)}
        </div>
        <div className={`console-message ${tone}`} role="status"><p className="font-fell italic">{message}</p>{tries !== null && <span className="font-mono">{tries} tries left</span>}{seconds > 0 && <span className="font-mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>}</div>
        {unlocked ? <Button className="auth-submit font-cinzel" disabled={!target || busy} onClick={() => { if (target) onRift(target); }}>ENTER THE RIFT</Button> : <>
          <div className="console-keypad">{['1','2','3','4','5','6','7','8','9','CLEAR','0','DEL'].map(key => <Button key={key} variant="outline" className={`console-key ${key.length > 1 ? 'font-mono console-command' : 'font-cinzel'}`} disabled={disabled || (digits.length >= 12 && key.length === 1)} onClick={() => setDigits(value => key === 'CLEAR' ? '' : key === 'DEL' ? value.slice(0, -1) : (value + key).slice(0, 12))}>{key}</Button>)}</div>
          <Button className="auth-submit font-cinzel" disabled={disabled || !digits} onClick={() => void enter()}>ENTER</Button>
        </>}
      </div>
    </PlateFrame>
    {flash && <div className="console-flash"><TransitionFlash on color={DIMENSION_GLOW[flash]} /></div>}
  </div>, document.body);
});