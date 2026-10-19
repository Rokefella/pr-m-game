import { memo, useEffect, useState, type CSSProperties } from 'react';
import { PlateCorners } from '@/components/theme/PlateFrame';

export const STEP_EXCHANGE_OPTIONS = [1, 5, 10] as const;
export const STEPS_PER_CREDIT = 100;

/** Largest option the player can afford, otherwise the smallest. */
export function defaultExchangeOption(credits: number): number {
  const affordable = STEP_EXCHANGE_OPTIONS.filter((n) => n <= credits);
  return affordable.length ? affordable[affordable.length - 1] : STEP_EXCHANGE_OPTIONS[0];
}

type Props = { open: boolean; credits: number; steps: number; onConfirm: (creditsSpent: number) => void; onClose: () => void };

const tile: CSSProperties = { background: '#0f1329', border: '1px solid #2f3560', padding: 10, minWidth: 0, textAlign: 'center' };
const label: CSSProperties = { fontSize: 11, color: '#8e99d0', letterSpacing: '0.15em' };

export default memo(function StepExchangeSheet({ open, credits, steps, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(() => defaultExchangeOption(credits));
  useEffect(() => { if (open) setSelected(defaultExchangeOption(credits)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const canAfford = credits >= selected;

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(14,18,40,.72)', zIndex: 90 }} />
      <div role="dialog" aria-label="Exchange credits for steps" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 'min(100vw, 480px)', maxHeight: 'min(72vh, 420px)',
        overflowY: 'auto', boxSizing: 'border-box', padding: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        background: '#1c2140', border: '2px solid #9aa4d8', borderBottom: 'none', zIndex: 91, animation: 'mazePanelSlide 280ms ease-out',
        '--plate-edge': '#2f3560', '--plate-gold': '#c8963a',
      } as CSSProperties}>
        <span className="plate-inner" aria-hidden="true" style={{ inset: 5 }}>{/* outline + brackets */}</span>
        <PlateCorners />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: -10, right: -10, width: 44, height: 44, background: 'transparent', border: 'none', color: '#8e99d0', fontSize: 22, cursor: 'pointer' }}>×</button>
          <div style={{ textAlign: 'center', padding: '0 36px' }}>
            <div className="font-cinzel" style={{ fontSize: 14, letterSpacing: '0.15em', color: '#b79bff' }}>EXCHANGE CREDITS FOR STEPS</div>
            <div className="font-mono" style={{ ...label, marginTop: 4 }}>1 credit = {STEPS_PER_CREDIT} steps</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={tile}><div className="font-mono" style={label}>CREDITS</div><div className="font-cinzel" style={{ fontSize: 28, color: '#f5c060' }}>{credits}</div></div>
            <div style={tile}><div className="font-mono" style={label}>STEPS</div><div className="font-cinzel" style={{ fontSize: 28, color: '#e8e4ff' }}>{steps}</div></div>
          </div>

          {credits <= 0 ? (
            <>
              <p className="font-fell italic" style={{ margin: 0, textAlign: 'center', fontSize: 16, color: '#d07a6a' }}>You have nothing left to give.</p>
              <button className="font-cinzel" onClick={onClose} style={{ minHeight: 44, background: 'transparent', border: '1px solid #4a5385', color: '#8e99d0', letterSpacing: '0.3em', cursor: 'pointer' }}>CLOSE</button>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                {STEP_EXCHANGE_OPTIONS.map((n) => {
                  const sel = selected === n;
                  const affordable = credits >= n;
                  return (
                    <button key={n} disabled={!affordable} aria-pressed={sel} onClick={() => setSelected(n)} style={{
                      minWidth: 0, minHeight: 56, padding: '6px 2px', overflow: 'hidden', cursor: affordable ? 'pointer' : 'default',
                      opacity: affordable ? 1 : 0.35, background: sel ? '#1f1a2e' : '#0f1329',
                      border: sel ? '2px solid #c8963a' : '1px solid #2f3560', color: sel ? '#f5c060' : '#8e99d0',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                    }}>
                      <span className="font-cinzel" style={{ fontSize: 13, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{n} {n === 1 ? 'CREDIT' : 'CREDITS'}</span>
                      <span className="font-mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>+{n * STEPS_PER_CREDIT} steps</span>
                    </button>
                  );
                })}
              </div>
              <p className="font-mono" style={{ ...label, margin: 0, textAlign: 'center', letterSpacing: '0.08em' }}>You will have {steps + selected * STEPS_PER_CREDIT} steps</p>
              <button className="font-cinzel" disabled={!canAfford} onClick={() => onConfirm(selected)} style={{
                width: '100%', minHeight: 48, letterSpacing: '0.3em', fontSize: 14, cursor: canAfford ? 'pointer' : 'default',
                background: canAfford ? '#c8963a' : '#2f3560', color: canAfford ? '#1a1448' : '#6a74b0', border: 'none',
                borderTop: canAfford ? '3px solid #f5c060' : '3px solid #2f3560', borderBottom: canAfford ? '3px solid #8a6420' : '3px solid #2f3560',
              }}>CONFIRM</button>
            </>
          )}
        </div>
      </div>
    </>
  );
});
