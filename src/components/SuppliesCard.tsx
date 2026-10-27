import { useNavigate } from 'react-router-dom';
import MerchantOverlay from '@/components/MerchantOverlay';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BETA_MODE } from '@/lib/config';
import { formatStepsBought } from '@/lib/merchantItems';

const LINES = ['Supplies for the road.'];

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  steps: number;
  credits: number;
  /** Called with server balances after a successful buy_steps. */
  onBalances: (steps: number, credits: number) => void;
  /** Settle pending local spending before buying. */
  beforeBuy?: () => Promise<unknown> | void;
};

/** Steps purchase opened from the HUD counters; the server owns all arithmetic. */
export default function SuppliesCard({ open, onClose, userId, steps, credits, onBalances, beforeBuy }: Props) {
  const navigate = useNavigate();
  const footer = <div style={{ width: '100%', maxWidth: 320, padding: '0 12px', marginTop: 12, textAlign: 'center' }}>
    <p className="font-mono" style={{ fontSize: 12, color: 'rgba(224,221,213,0.8)' }}>STEPS {steps} · CREDITS {credits}</p>
    <p className="font-fell italic" style={{ fontSize: 14, color: 'rgba(160,140,200,0.7)', marginTop: 12 }}>More credits come with your subscription.</p>
    {!BETA_MODE && <Button variant="ghost" className="font-cinzel" onClick={() => { onClose(); navigate('/paywall'); }}
      style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--plate-gold)', border: '0.5px solid var(--plate-gold)', background: 'transparent', padding: '8px 18px', height: 'auto', borderRadius: 0, marginTop: 10 }}>SEE PLANS</Button>}
  </div>;
  return <MerchantOverlay open={open} onClose={onClose} dismissible palette="green" title="Supplies" openingLines={LINES} userId={userId} credits={credits}
    onCreditsChange={c => onBalances(steps, c)} footer={footer}
    items={[{ key: 'steps', label: '500 Steps', cost: 5, maxQty: 20, serverSide: true, onPurchase: async (qty = 1) => {
      if (beforeBuy) await Promise.race([Promise.resolve(beforeBuy()).catch(() => undefined), new Promise(r => window.setTimeout(r, 4000))]);
      const { data, error } = await supabase.rpc('buy_steps', { p_packs: qty });
      if (error) throw error;
      const r = data as { ok?: boolean; reason?: string; packs?: number; cost?: number; credits?: number; steps_remaining?: number } | null;
      if (!r?.ok) return { failure: r?.reason === 'steps_full' ? 'Your steps are full.' : 'Not enough credits.' };
      const s = Number(r.steps_remaining) || 0, c = Number(r.credits) || 0;
      onBalances(s, c);
      return { receipt: formatStepsBought(Number(r.packs) || qty, Number(r.cost) || qty * 5), credits: c };
    } }]} />;
}
