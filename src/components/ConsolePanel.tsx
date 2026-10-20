import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlateFrame from '@/components/theme/PlateFrame';
import { TransitionFlash } from '@/components/theme/transition/DoorTransition';
import { supabase } from '@/lib/supabase';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import type { ConsoleResult, RiftTarget } from '@/lib/console';
import { useAuth } from '@/context/AuthContext';

type CarriedDrop = { id: string; name: string; category: string };
type DropRow = { id: string; drop_type_id: string; drop_types?: { name: string; category: string } | { name: string; category: string }[] | null };
function KeyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 24" width="32" height="24" shapeRendering="crispEdges"><path fill="currentColor" fillRule="evenodd" d="M2 4h12v12H2V4Zm4 4v4h4V8H6Zm8 1h16v4h-4v6h-4v-6h-8V9Z" /></svg>;
}

type Props = { open: boolean; level: number; onClose: () => void; onRift: (target: RiftTarget) => void };
export default memo(function ConsolePanel({ open, level, onClose, onRift }: Props) {
  const { user } = useAuth();
  const [drops, setDrops] = useState<CarriedDrop[]>([]);
  const [selectedDrop, setSelectedDrop] = useState<CarriedDrop | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dropsLoading, setDropsLoading] = useState(false);
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
    setSelectedDrop(null); setPickerOpen(false);
    const previous = document.activeElement;
    dialog.current?.focus();
    void (async () => {
      try {
        const { data, error } = await supabase.from('console_unlocks' as never).select('level_number').eq('level_number', level).maybeSingle();
        if (version !== generation.current) return;
        if (error) throw error;
        if (data) {
          setUnlocked(true); setMessage('The rift is open.');
          const result = await supabase.rpc('use_console' as never, { p_level: level, p_code: '0', p_drop_id: null } as never);
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
    if (!open || !user || unlocked) { setDrops([]); return; }
    let cancelled = false;
    setDropsLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from('drops' as never)
          .select('id, drop_type_id, drop_types(name, category)').eq('user_id', user.id);
        if (cancelled) return;
        if (error) throw error;
        const carried = ((data ?? []) as unknown as DropRow[]).map(row => {
          const type = Array.isArray(row.drop_types) ? row.drop_types[0] : row.drop_types;
          return { id: row.id, name: type?.name ?? 'Unknown', category: type?.category ?? '' };
        });
        carried.sort((a, b) => Number(b.category === 'key') - Number(a.category === 'key'));
        setDrops(carried);
      } catch { if (!cancelled) setDrops([]); }
      finally { if (!cancelled) setDropsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, user, unlocked]);

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
      const { data, error } = await supabase.rpc('use_console' as never, { p_level: level, p_code: digits, p_drop_id: selectedDrop?.id ?? null } as never);
      if (version !== generation.current) return;
      const result = data as unknown as ConsoleResult | null;
      if (error || !result) throw error ?? new Error('No signal');
      if (result.ok === true) {
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
        case 'wrong_key': setMessage('That key does not fit.'); setSelectedDrop(null); break;
        case 'no_key': setMessage('Insert a key first.'); setTone('gold'); break;
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
      <span className="console-rivets" aria-hidden="true">{['tl', 'tr', 'bl', 'br'].map(corner => <i key={corner} className={`console-rivet-${corner}`} />)}</span>
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
        <div className="console-display font-cinzel" aria-label={`Code: ${digits || 'empty'}`}>
          {Array.from({ length: 8 }, (_, i) => <span key={i} className={digits[i] ? 'console-typed' : `console-empty ${i === digits.length && !unlocked ? 'console-next' : ''}`}>{digits[i] ?? ''}</span>)}
        </div>
        <div className={`console-message ${tone}`} role="status"><p className="font-fell italic">{message}</p>{tries !== null && <span className="font-mono">{tries} tries left</span>}{seconds > 0 && <span className="font-mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>}</div>
        {unlocked ? <Button className="auth-submit font-cinzel" disabled={!target || busy} onClick={() => { if (target) onRift(target); }}>ENTER THE RIFT</Button> : <>
          <div className="console-socket-row">
            <div className={`console-socket ${selectedDrop ? 'console-inserted' : ''}`}>
              <Button variant="ghost" className="console-socket-button" aria-label={selectedDrop ? `Remove key: ${selectedDrop.name}` : pickerOpen ? 'Close key picker' : 'Insert key'} disabled={disabled} onClick={() => {
                if (selectedDrop) { setSelectedDrop(null); setPickerOpen(false); }
                else setPickerOpen(value => !value);
              }}><span className="console-key-slot"><KeyIcon /></span><span className="console-socket-copy"><span className="font-mono console-socket-label">KEY</span><span className={selectedDrop ? 'font-cinzel console-drop-name' : 'font-fell italic'}>{selectedDrop?.name ?? 'Insert key'}</span></span></Button>
              {selectedDrop && <Button variant="ghost" className="console-remove-key" aria-label="Remove inserted key" disabled={disabled} onClick={() => { setSelectedDrop(null); setPickerOpen(false); }}><X size={14} /></Button>}
            </div>
            <div className="console-lamps font-mono"><span><i className="console-lamp console-lamp-locked" />LOCKED</span><span><i className={`console-lamp console-lamp-ready ${selectedDrop && digits.length > 0 ? 'console-ready-lit' : ''}`} />READY</span></div>
          </div>
          {pickerOpen ? <div className="console-picker" aria-label="Carried drops">
            {dropsLoading ? <p className="font-fell italic">…</p> : drops.length === 0 ? <p className="font-fell italic">No keys carried</p> : drops.map(drop => <Button key={drop.id} variant="outline" className="console-drop-tile font-cinzel" disabled={disabled} onClick={() => { setSelectedDrop(drop); setPickerOpen(false); }}>{drop.name}</Button>)}
          </div> : <div className="console-keypad">{['1','2','3','4','5','6','7','8','9','CLEAR','0','DEL'].map(key => <Button key={key} variant="outline" className={`console-key ${key.length > 1 ? 'font-mono console-command' : 'font-cinzel'}`} disabled={disabled || (digits.length >= 8 && key.length === 1)} onClick={() => setDigits(value => key === 'CLEAR' ? '' : key === 'DEL' ? value.slice(0, -1) : (value + key).slice(0, 8))}>{key}</Button>)}</div>}
          <Button className="auth-submit font-cinzel" disabled={disabled || !digits} onClick={() => void enter()}>ENTER</Button>
        </>}
      </div>
    </PlateFrame>
    {flash && <div className="console-flash"><TransitionFlash on color={DIMENSION_GLOW[flash]} /></div>}
  </div>, document.body);
});