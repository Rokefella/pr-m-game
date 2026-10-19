import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlateFrame from '@/components/theme/PlateFrame';
import { useReducedMotion } from '@/components/theme/useReducedMotion';
import GateScene, { DOOR_COLORS, type GateKind } from './GateScene';
import './transition.css';

export const DOOR_OPEN_MS = 700;
export const DOOR_NAVIGATE_MS = 1200;
export const REDUCED_NAVIGATE_MS = 150;

const MOTES = [
  { left: '18%', top: '82%', dur: 6, delay: 0 },
  { left: '34%', top: '70%', dur: 8, delay: 1.5 },
  { left: '58%', top: '88%', dur: 7, delay: 3 },
  { left: '74%', top: '76%', dur: 9, delay: 0.8 },
  { left: '86%', top: '64%', dur: 6.5, delay: 2.2 },
];

export const TransitionFlash = memo(function TransitionFlash({ color, on }: { color: string; on: boolean }) {
  return <div className={`transition-flash ${on ? 'on' : ''}`} style={{ background: `radial-gradient(circle, ${color} 0%, #fff 100%)` }} aria-hidden="true" />;
});

type Props = { kind: GateKind; lines: string[]; destination: string; onStay?: () => void };

export default memo(function DoorTransition({ kind, lines, destination, onStay }: Props) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const color = DOOR_COLORS[kind];

  const onYes = () => {
    if (open) return;
    setOpen(true);
    if (reduced) {
      setFlash(true);
      timers.current.push(window.setTimeout(() => navigate(destination), REDUCED_NAVIGATE_MS));
      return;
    }
    timers.current.push(window.setTimeout(() => setFlash(true), DOOR_OPEN_MS));
    timers.current.push(window.setTimeout(() => navigate(destination), DOOR_NAVIGATE_MS));
  };
  const onStayClick = () => (onStay ? onStay() : navigate('/village'));

  return (
    <div className="transition-backdrop">
      <PlateFrame glow={color} width="min(92vw, 340px)">
        {MOTES.map((m, i) => (
          <span key={i} className="transition-mote" style={{ left: m.left, top: m.top, background: color, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }} />
        ))}
        <div className="transition-stack">
          <p className="font-fell italic" style={{ margin: 0, fontSize: 20, lineHeight: 1.3, color: '#e8e4ff' }}>
            {lines.map((l) => <span key={l} style={{ display: 'block' }}>{l}</span>)}
          </p>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', width: '140%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: `radial-gradient(circle, ${color}1f 0%, ${color}00 70%)`, pointerEvents: 'none' }} />
            <GateScene kind={kind} open={open} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%' }}>
            <button className="font-cinzel transition-btn transition-btn-primary" disabled={open} onClick={onYes}>YES</button>
            <button className="font-cinzel transition-btn transition-btn-secondary" disabled={open} onClick={onStayClick}>STAY</button>
          </div>
        </div>
      </PlateFrame>
      <TransitionFlash color={color} on={flash} />
    </div>
  );
});
