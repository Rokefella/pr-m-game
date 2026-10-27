import { Z } from '@/lib/zIndex';
import { useEffect, useMemo, useRef, useState } from 'react';
import { updateUser } from '@/lib/userData';
import NpcOrb from '@/components/theme/objects/NpcOrb';
import { npcBodyPx } from '@/lib/orbSizes';
import NpcPortrait from '@/components/NpcPortrait';
import { useAuth } from '@/context/AuthContext';
import { NPC_DIALOGUE_CLOSED, useNpcQuestStates } from '@/hooks/useNpcQuestStates';
import { Button } from '@/components/ui/button';

export type MerchantPalette = 'green' | 'orange';

export type PurchaseOutcome = string | void | { receipt: string; credits?: number } | { failure: string };

export type MerchantItem = {
  key: string;
  label: string;
  cost: number;
  /** Allow buying several at once (stepper 1..maxQty). */
  maxQty?: number;
  /** Server-side purchase: the RPC moves credits and steps; the client never writes them. */
  serverSide?: boolean;
  /** Complete the purchase effect before saving credits; optionally override the receipt. */
  onPurchase?: (qty: number) => PurchaseOutcome | Promise<PurchaseOutcome>;
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
  const questState = useNpcQuestStates(userId);
  const { rgb } = PALETTE[palette];
  const [shown, setShown] = useState(false);
  const lineIndexRef = useRef(0);
  const [line, setLine] = useState('');
  const [feedback, setFeedback] = useState<Record<string, { text: string; ok: boolean } | undefined>>({});
  const feedbackTimers = useRef<Record<string, number>>({});
  const buying = useRef(false);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});

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
  useEffect(() => {
    if (!open) return;
    return () => { window.dispatchEvent(new Event(NPC_DIALOGUE_CLOSED)); };
  }, [open]);

  if (!open) return null;

  const showFeedback = (key: string, text: string, ok: boolean) => {
    setFeedback((f) => ({ ...f, [key]: { text, ok } }));
    if (feedbackTimers.current[key]) window.clearTimeout(feedbackTimers.current[key]);
    feedbackTimers.current[key] = window.setTimeout(
      () => setFeedback((f) => ({ ...f, [key]: undefined })),
      1500,
    );
  };

  const buy = async (item: MerchantItem) => {
    if (buying.current) return;
    const count = Math.max(1, Math.min(item.maxQty ?? 1, qty[item.key] ?? 1));
    if (credits < item.cost * count) {
      showFeedback(item.key, 'Not enough credits.', false);
      return;
    }
    buying.current = true; setBusy(true);
    let receipt: string | void;
    try {
      const result = await item.onPurchase?.(count);
      if (result && typeof result === 'object' && 'failure' in result) {
        showFeedback(item.key, result.failure, false);
        return;
      }
      if (result && typeof result === 'object') {
        receipt = result.receipt;
        if (typeof result.credits === 'number') onCreditsChange(result.credits);
      } else {
        receipt = result;
      }
      if (!item.serverSide) {
        const next = credits - item.cost * count;
        onCreditsChange(next);
        await updateUser(userId, { credits: next });
      }
    } catch (e) {
      console.error('[Merchant] purchase failed', e);
      showFeedback(item.key, 'Not right now.', false);
      return;
    } finally {
      buying.current = false; setBusy(false);
    }
    showFeedback(item.key, receipt || 'Acquired.', true);
  };

  return (
    <div data-game-ui="open" data-no-thumbstick
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,4,10,0.96)',
        opacity: shown ? 1 : 0,
        transition: 'opacity 400ms ease-out',
        zIndex: Z.OVERLAY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      <div style={{ marginTop: 40 }}><NpcPortrait npc="merchant" /></div>
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
                {item.cost * Math.max(1, Math.min(item.maxQty ?? 1, qty[item.key] ?? 1))}c
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Button variant="ghost"
                className="font-cinzel"
                onClick={() => buy(item)}
                disabled={busy}
                style={{
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  background: `rgba(${rgb},0.15)`,
                  border: `0.5px solid rgba(${rgb},0.4)`,
                  color: `rgba(${rgb},0.8)`,
                  padding: '6px 16px',
                  height: 'auto',
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                BUY
              </Button>
              {item.maxQty ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Button variant="ghost" aria-label={`Fewer ${item.label}`} disabled={busy}
                    onClick={() => setQty((q) => ({ ...q, [item.key]: Math.max(1, (q[item.key] ?? 1) - 1) }))}
                    style={{ fontSize: 12, color: `rgba(${rgb},0.8)`, border: `0.5px solid rgba(${rgb},0.4)`, background: 'transparent', padding: '4px 10px', height: 'auto', borderRadius: 0, cursor: 'pointer' }}
                  >−</Button>
                  <span className="font-mono" style={{ fontSize: 12, color: `rgba(${rgb},0.8)`, minWidth: 18, textAlign: 'center' }}>
                    {Math.max(1, Math.min(item.maxQty, qty[item.key] ?? 1))}
                  </span>
                  <Button variant="ghost" aria-label={`More ${item.label}`} disabled={busy}
                    onClick={() => setQty((q) => ({ ...q, [item.key]: Math.min(item.maxQty, (q[item.key] ?? 1) + 1) }))}
                    style={{ fontSize: 12, color: `rgba(${rgb},0.8)`, border: `0.5px solid rgba(${rgb},0.4)`, background: 'transparent', padding: '4px 10px', height: 'auto', borderRadius: 0, cursor: 'pointer' }}
                  >+</Button>
                  <Button variant="ghost" aria-label={`Max ${item.label}`} disabled={busy}
                    onClick={() => setQty((q) => ({ ...q, [item.key]: item.maxQty }))}
                    className="font-cinzel"
                    style={{ fontSize: 9, letterSpacing: '0.2em', color: `rgba(${rgb},0.8)`, border: `0.5px solid rgba(${rgb},0.4)`, background: 'transparent', padding: '4px 10px', height: 'auto', borderRadius: 0, cursor: 'pointer' }}
                  >MAX</Button>
                </div>
              ) : null}
              {feedback[item.key] && (
                <span
                  className="font-fell italic"
                  style={{
                    fontSize: 12,
                    color: feedback[item.key]?.ok
                      ? `rgba(${rgb},0.6)`
                      : 'rgba(200,80,80,0.6)',
                  }}
                >
                  {feedback[item.key]?.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost"
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
          height: 'auto',
          borderRadius: 0,
        }}
      >
        LEAVE
      </Button>

    </div>
  );
};

export default MerchantOverlay;

export const MerchantCharacter = ({
  x,
  y,
}: { x: number; y: number; palette: MerchantPalette }) => {
  const { user } = useAuth();
  const questState = useNpcQuestStates(user?.id);
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 4 }}><NpcOrb npc="merchant" size={npcBodyPx('village')} quest={questState('merchant')} /></div>
  );
};
