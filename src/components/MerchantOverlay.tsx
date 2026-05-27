import { useEffect, useMemo, useRef, useState } from 'react';
import { updateUser } from '@/lib/userData';

export type MerchantPalette = 'green' | 'orange';

export type MerchantItem = {
  key: string;
  label: string;
  cost: number;
  /** Called after credits have been deducted. Return optional inline acquired-message override. */
  onPurchase?: () => string | void;
};

interface MerchantOverlayProps {
  open: boolean;
  onClose: () => void;
  palette: MerchantPalette;
  title: string;
  openingLines: string[];
  items: MerchantItem[];
  userId: string;
  credits: number;
  onCreditsChange: (next: number) => void;
}

const PALETTE = {
  green: { rgb: '34,197,94' },
  orange: { rgb: '249,115,22' },
};

const MerchantOverlay = ({
  open,
  onClose,
  palette,
  title,
  openingLines,
  items,
  userId,
  credits,
  onCreditsChange,
}: MerchantOverlayProps) => {
  const { rgb } = PALETTE[palette];
  const [shown, setShown] = useState(false);
  const lineIndexRef = useRef(0);
  const [line, setLine] = useState('');
  const [feedback, setFeedback] = useState<Record<string, { text: string; ok: boolean } | undefined>>({});
  const feedbackTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const idx = lineIndexRef.current % openingLines.length;
      setLine(openingLines[idx]);
      lineIndexRef.current = idx + 1;
      requestAnimationFrame(() => setShown(true));
    } else {
      setShown(false);
    }
  }, [open, openingLines]);

  if (!open) return null;

  const buy = async (item: MerchantItem) => {
    if (credits < item.cost) {
      setFeedback((f) => ({ ...f, [item.key]: { text: 'Insufficient credits.', ok: false } }));
      if (feedbackTimers.current[item.key]) window.clearTimeout(feedbackTimers.current[item.key]);
      feedbackTimers.current[item.key] = window.setTimeout(
        () => setFeedback((f) => ({ ...f, [item.key]: undefined })),
        1500,
      );
      return;
    }
    const next = credits - item.cost;
    onCreditsChange(next);
    const override = item.onPurchase?.();
    try {
      await updateUser(userId, { credits: next });
    } catch (e) {
      console.error('[Merchant] failed to update credits', e);
    }
    setFeedback((f) => ({ ...f, [item.key]: { text: override || 'Acquired.', ok: true } }));
    if (feedbackTimers.current[item.key]) window.clearTimeout(feedbackTimers.current[item.key]);
    feedbackTimers.current[item.key] = window.setTimeout(
      () => setFeedback((f) => ({ ...f, [item.key]: undefined })),
      1500,
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,4,10,0.96)',
        opacity: shown ? 1 : 0,
        transition: 'opacity 400ms ease-out',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: `rgba(${rgb},0.9)`,
          boxShadow: `0 0 10px rgba(${rgb},0.7)`,
          marginTop: 40,
        }}
      />
      <div
        className="font-cinzel"
        style={{
          fontSize: 14,
          color: `rgba(${rgb},0.7)`,
          letterSpacing: '0.2em',
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        {title}
      </div>
      <p
        className="font-fell italic"
        style={{
          fontSize: 16,
          color: 'rgba(160,140,200,0.7)',
          textAlign: 'center',
          marginTop: 8,
          maxWidth: 320,
          padding: '0 16px',
        }}
      >
        {line}
      </p>

      <div
        style={{
          marginTop: 32,
          width: '100%',
          maxWidth: 320,
          padding: '0 8px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 4px',
              borderTop: i === 0 ? 'none' : '1px solid rgba(100,80,160,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className="font-fell italic"
                style={{ fontSize: 14, color: 'rgba(160,140,200,0.8)', flex: 1, textAlign: 'left' }}
              >
                {item.label}
              </div>
              <div className="font-mono" style={{ fontSize: 12, color: '#c8963a' }}>
                {item.cost}c
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button
                className="font-cinzel"
                onClick={() => buy(item)}
                style={{
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  background: `rgba(${rgb},0.15)`,
                  border: `0.5px solid rgba(${rgb},0.4)`,
                  color: `rgba(${rgb},0.8)`,
                  padding: '6px 16px',
                  cursor: 'pointer',
                }}
              >
                BUY
              </button>
              {feedback[item.key] && (
                <span
                  className="font-fell italic"
                  style={{
                    fontSize: 12,
                    color: feedback[item.key]!.ok
                      ? `rgba(${rgb},0.6)`
                      : 'rgba(200,80,80,0.6)',
                  }}
                >
                  {feedback[item.key]!.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 11,
          letterSpacing: '0.2em',
          color: 'rgba(160,140,200,0.4)',
          background: 'transparent',
          border: '1px solid rgba(160,140,200,0.15)',
          padding: '16px 0',
          paddingLeft: 32,
          paddingRight: 32,
          width: 'auto',
          cursor: 'pointer',
          marginTop: 24,
        }}
      >
        LEAVE
      </button>

      <style>{`
        @keyframes merchantSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MerchantOverlay;

export const MerchantCharacter = ({
  x,
  y,
  palette,
}: { x: number; y: number; palette: MerchantPalette }) => {
  const { rgb } = PALETTE[palette];
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 8,
          top: y - 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `1px solid rgba(${rgb},0.4)`,
          animation: 'merchantSpin 4s linear infinite',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 5,
          top: y - 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: `rgba(${rgb},0.9)`,
          boxShadow: `0 0 10px rgba(${rgb},0.7)`,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
    </>
  );
};
