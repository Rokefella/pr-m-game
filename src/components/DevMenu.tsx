import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MOVEMENT_DEBUG_EVENT } from '@/components/MovementDebugOverlay';
import { supabase } from '@/lib/supabase';
import { updateUser } from '@/lib/userData';
import { _resetQuestFlagCache, setFlag } from '@/lib/questFlags';
import { Z } from '@/lib/zIndex';
import './game-home.css';
import { goBackToStart, START_CONFIRMATION } from '@/lib/goBackToStart';

type Props = { open: boolean; onClose: () => void; userId?: string; home?: 'world' | 'village'; onChanged?: () => void };
export default function DevMenu({ open, onClose: close, userId, home = 'village', onChanged }: Props) {
  const navigate = useNavigate();
  const user = userId ? { id: userId } : null;
  const onClose = useCallback(() => { close(); onChanged?.(); }, [close, onChanged]);
  const [devVillageLevel, setDevVillageLevel] = useState('1');
  const [devMazeLevel, setDevMazeLevel] = useState('1');
  const [devStageNote, setDevStageNote] = useState<string | null>(null);
  const [fullResetArmed, setFullResetArmed] = useState(false);
  const [startArmed, setStartArmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const fullResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fullResetTimerRef.current) clearTimeout(fullResetTimerRef.current); }, []);
  const handleDevReset = useCallback(async () => {
    if (!userId || starting) return;
    setStarting(true);
    try { await goBackToStart(userId); close(); navigate('/intro'); }
    catch (e) { setDevStageNote(e instanceof Error ? e.message : 'Could not start over.'); }
    finally { setStarting(false); }
  }, [userId, navigate, close, starting]);
  return open ? (
        <div
          className="font-mono" data-game-ui="open"
          style={{
            position: 'fixed', inset: 0, background: 'var(--game-dev-backdrop)', zIndex: Z.OVERLAY,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => onClose()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--instrument-shadow)', border: '1px solid var(--game-dev-text)', padding: 20,
              minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10,
              color: 'var(--game-dev-text)', fontSize: 13, letterSpacing: '0.1em',
              maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            }}
          >
            <div style={{ opacity: 0.7, marginBottom: 6 }}>DEV MENU</div>
            <Button variant="outline" className="world-dev-entry font-mono" onClick={() => { onClose(); navigate('/world'); }}>WORLD TEST</Button>

            {home === 'world' && <Button variant="outline" onClick={() => { onClose(); navigate('/village'); }}>OLD VILLAGE</Button>}
            <div style={{ opacity: 0.7, fontSize: 11 }}>PROFILE</div>
            <Button variant="outline" onClick={() => setStartArmed(true)}>GO BACK TO START</Button>
            {startArmed && <section role="alertdialog" aria-label="Go back to start" className="max-w-[320px] text-foreground"><p className="font-fell leading-relaxed">{START_CONFIRMATION}</p><div className="flex gap-2 mt-3"><Button variant="outline" disabled={starting} onClick={() => void handleDevReset()}>{starting ? '…' : 'CONFIRM'}</Button><Button variant="ghost" disabled={starting} onClick={() => setStartArmed(false)}>CANCEL</Button></div></section>}
            <Button variant="ghost" type="button" onClick={async () => {
              const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>)('dev_grant_skins');
              setDevStageNote(error ? error.message : `GRANTED ${typeof data === 'number' ? data : 0} SKINS`);
              onChanged?.();
            }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>GRANT ALL SKINS</Button>
            <Button variant="ghost" type="button" onClick={async () => {
              if (!fullResetArmed) {
                setFullResetArmed(true);
                if (fullResetTimerRef.current) clearTimeout(fullResetTimerRef.current);
                fullResetTimerRef.current = setTimeout(() => setFullResetArmed(false), 4000);
                return;
              }
              if (fullResetTimerRef.current) clearTimeout(fullResetTimerRef.current);
              setFullResetArmed(false);
              const { error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: { message: string } | null }>)('dev_reset_progress');
              if (error) {
                setDevStageNote(error.message);
                return;
              }
              _resetQuestFlagCache();
              Object.keys(localStorage).filter(k => k.startsWith('praem_')).forEach(k => localStorage.removeItem(k));
              sessionStorage.clear();
              onClose();
              await supabase.auth.signOut();
              navigate('/');
            }} style={{ background: 'transparent', border: '1px solid var(--game-dev-danger)', color: 'var(--game-dev-danger)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>{fullResetArmed ? 'TAP AGAIN TO CONFIRM' : 'FULL RESET (everything)'}</Button>

            <Button variant="ghost" type="button" onClick={() => {
              const on = localStorage.getItem('praem_movement_debug') === '1';
              if (on) localStorage.removeItem('praem_movement_debug'); else localStorage.setItem('praem_movement_debug', '1');
              window.dispatchEvent(new Event(MOVEMENT_DEBUG_EVENT));
              onClose();
            }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>MOVEMENT DEBUG</Button>
            <div style={{ height: 1, background: 'var(--game-dev-divider)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>SUBSCRIPTION OVERRIDES</div>
            <Button variant="ghost" type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'active'); onClose(); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: ACTIVE</Button>
            <Button variant="ghost" type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'expired'); onClose(); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: EXPIRED</Button>
            <Button variant="ghost" type="button" onClick={() => { sessionStorage.removeItem('dev_sub_override'); onClose(); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>CLEAR OVERRIDE</Button>

            <div style={{ height: 1, background: 'var(--game-dev-divider)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>LEVEL JUMP</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={1} max={30} value={devVillageLevel}
                onChange={(e) => setDevVillageLevel(e.target.value)}
                style={{ background: 'var(--instrument-shadow)', border: '1px solid var(--game-dev-border)', color: 'var(--game-dev-text)', padding: '6px 8px', width: 64, fontFamily: 'inherit', fontSize: 13 }}
              />
              <Button variant="ghost" type="button" onClick={async () => {
                const n = Math.min(30, Math.max(1, parseInt(devVillageLevel, 10) || 1));
                onClose();
                if (user) await updateUser(user.id, { level: n });
                navigate(home === 'world' ? '/world' : '/village');
              }} style={{ flex: 1, background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → {home === 'world' ? 'WORLD' : 'VILLAGE'} L#</Button>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={1} max={30} value={devMazeLevel}
                onChange={(e) => setDevMazeLevel(e.target.value)}
                style={{ background: 'var(--instrument-shadow)', border: '1px solid var(--game-dev-border)', color: 'var(--game-dev-text)', padding: '6px 8px', width: 64, fontFamily: 'inherit', fontSize: 13 }}
              />
              <Button variant="ghost" type="button" onClick={async () => {
                const n = Math.min(30, Math.max(1, parseInt(devMazeLevel, 10) || 1));
                onClose();
                if (user) await updateUser(user.id, { level: n });
                navigate('/maze');
              }} style={{ flex: 1, background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L#</Button>
            </div>

            <div style={{ height: 1, background: 'var(--game-dev-divider)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>SAM STAGE</div>
            {devStageNote && <div style={{ fontSize: 11, color: 'var(--plate-gold)' }}>{devStageNote}</div>}
            {([
              { label: 'stage_0', stage: 0, touched: null as boolean | null },
              { label: 'stage_1 (pending)', stage: 1, touched: false },
              { label: 'stage_1 (ready)', stage: 1, touched: true },
              { label: 'stage_2', stage: 2, touched: null },
              { label: 'stage_3', stage: 3, touched: null },
              { label: 'stage_4', stage: 4, touched: null },
              { label: 'stage_5', stage: 5, touched: null },
              { label: 'stage_6', stage: 6, touched: null },
            ]).map((s) => (
              <Button variant="ghost"
                key={s.label}
                type="button"
                onClick={async () => {
                  if (!user) return;
                  await setFlag(user.id, 'bernard_stage', String(s.stage));
                  if (s.touched !== null) {
                    const v = s.touched ? 'true' : 'false';
                    await setFlag(user.id, 'touched_23', v);
                    await setFlag(user.id, 'touched_47', v);
                    await setFlag(user.id, 'touched_89', v);
                  }
                  setDevStageNote(`SET → ${s.label}`);
                  onClose();
                }}
                style={{ background: 'transparent', border: '1px solid var(--game-dev-border)', color: 'var(--game-dev-text)', padding: '6px 10px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                {s.label}
              </Button>
            ))}

            <div style={{ height: 1, background: 'var(--game-dev-divider)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>NAVIGATION</div>
            <Button variant="ghost" type="button" onClick={() => { onClose(); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Maze</Button>
            <Button variant="ghost" type="button" onClick={() => { onClose(); navigate('/door'); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Door</Button>
            <Button variant="ghost" type="button" onClick={async () => { onClose(); if (user) await updateUser(user.id, { level: 1 }); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L1</Button>
            <Button variant="ghost" type="button" onClick={async () => { onClose(); if (user) await updateUser(user.id, { level: 2 }); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L2</Button>
            <Button variant="ghost" type="button" onClick={() => { onClose(); navigate('/shadow'); }} style={{ background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → SHADOW</Button>



            <Button variant="ghost" type="button" onClick={() => onClose()} style={{ background: 'transparent', border: '1px solid var(--game-dev-border)', color: 'var(--game-registration)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Close</Button>
          </div>
        </div>
      ) : null;
}
