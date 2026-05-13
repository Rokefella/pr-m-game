import { useEffect, useState } from 'react';

type Props = {
  onContinue: () => void;
  onDismiss: () => void;
};

const PaywallOverlay = ({ onContinue, onDismiss }: Props) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStage(1), 800);
    const t2 = window.setTimeout(() => setStage(2), 1600);
    const t3 = window.setTimeout(() => setStage(3), 2400);
    const t4 = window.setTimeout(() => setStage(4), 3000);
    return () => { [t1, t2, t3, t4].forEach(window.clearTimeout); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#04040a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflow: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(91,79,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,79,212,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 460 }}>
        <svg width={80} height={48} viewBox="-40 -24 80 48" style={{ opacity: 1, transition: 'opacity 600ms' }}>
          <ellipse cx={0} cy={0} rx={40} ry={24} stroke="rgba(160,140,200,0.5)" strokeWidth={1} fill="none" />
          <circle cx={0} cy={0} r={6} fill="#5b4fd4" />
        </svg>

        {stage >= 1 && (
          <p className="font-fell italic" style={{ fontSize: 20, color: 'rgba(160,140,200,0.9)', textAlign: 'center', margin: 0 }}>
            You have found your way through the first dimension.
          </p>
        )}
        {stage >= 2 && (
          <p className="font-fell italic" style={{ fontSize: 16, color: 'rgba(160,140,200,0.6)', textAlign: 'center', margin: 0 }}>
            What comes next requires commitment.
          </p>
        )}
        {stage >= 3 && (
          <>
            <p className="font-cinzel" style={{ fontSize: 14, color: '#c8963a', letterSpacing: '0.2em', textAlign: 'center', margin: '12px 0 0' }}>
              €2.99 / MONTH · CANCEL ANY TIME
            </p>
            <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: 0, maxWidth: 360 }}>
              Your registration number is yours forever. Your Trace remains. Your title remains. The world waits.
            </p>
          </>
        )}
        {stage >= 4 && (
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="font-cinzel"
              onClick={onContinue}
              style={{
                fontSize: 11, letterSpacing: '0.28em',
                background: '#c8963a', color: '#04040a',
                border: 'none', padding: '10px 32px', cursor: 'pointer',
              }}
            >
              CONTINUE
            </button>
            <button
              className="font-cinzel"
              onClick={onDismiss}
              style={{
                fontSize: 11, letterSpacing: '0.28em',
                background: 'transparent', color: 'rgba(160,140,200,0.5)',
                border: '0.5px solid rgba(160,140,200,0.3)',
                padding: '10px 32px', cursor: 'pointer',
              }}
            >
              NOT YET
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaywallOverlay;
