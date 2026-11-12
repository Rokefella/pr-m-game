import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import DropIcon from './DropIcon';
import { canSellPraem, discoverPraemEntrances, mutatePraem, myPraems, praemFailure, praemMarket, type Praem, type PraemListing } from '@/lib/praems';

export default function PraemMarket({ userId, credits, onCredits }: { userId: string; credits: number; onCredits: (credits: number) => void }) {
  const [items, setItems] = useState<Praem[]>([]), [listings, setListings] = useState<PraemListing[]>([]), [confirm, setConfirm] = useState<Praem | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const flight = useRef(false), mounted = useRef(true);
  const load = useCallback(async () => {
    const [owned, market] = await Promise.all([myPraems(), praemMarket()]);
    if (mounted.current) { setItems(owned); setListings(market); }
    return owned;
  }, []);
  useEffect(() => { mounted.current = true; void load().catch(() => { if (mounted.current) setNote('The offers could not be read.'); }).finally(() => { if (mounted.current) setLoading(false); }); return () => { mounted.current = false; }; }, [load]);
  const trade = async (fn: 'sell_praem' | 'buy_praem', args: Record<string, unknown>) => {
    if (flight.current) return; flight.current = true; setBusy(true); setNote('');
    try {
      const r = await mutatePraem(fn, args);
      if (!r.ok) { setNote(praemFailure(r.reason)); return; }
      if (typeof r.credits === 'number') onCredits(r.credits);
      setConfirm(null); setNote(fn === 'sell_praem' ? `+${r.earned ?? 0} credits` : `−${r.paid ?? 0} credits`);
      const owned = await load(); if (fn === 'buy_praem') void discoverPraemEntrances(userId, owned).catch(() => undefined);
    } catch { setNote(praemFailure()); }
    finally { flight.current = false; if (mounted.current) setBusy(false); }
  };
  return <section aria-label="Præm market"><p className="font-fell italic">Each one is a way back. I buy them at a fair price and sell them at a fairer one.</p>
    {loading && <p className="font-mono">…</p>}
    <h3 className="font-cinzel">Yours</h3>{items.filter(p => p.state === 'set').map(p => <div key={p.maze} className="praem-trade-row"><DropIcon svg={p.icon_lit || p.icon_svg} size={32} /><span className="font-fell">{p.name}</span>{canSellPraem(p) && <Button disabled={busy} onClick={() => setConfirm(p)}>Sell for {p.sell_price}</Button>}</div>)}
    {confirm && <div role="alertdialog" aria-label="Confirm Præm sale" className="praem-confirm"><p className="font-fell">Sell {confirm.name}? You keep the map, but the way through closes. You will never find this one again.</p><div className="flex gap-2"><Button disabled={busy} onClick={() => void trade('sell_praem', { p_maze: confirm.maze })}>Sell</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Keep it</Button></div></div>}
    <h3 className="font-cinzel">Offered</h3>{!loading && !listings.length && <p className="font-fell italic">Nothing is offered right now.</p>}
    {listings.map(p => <div key={p.id} className="praem-trade-row"><DropIcon svg={p.icon_svg} size={32} /><span className="font-fell">{p.name}<small className="block">{p.price} credits</small></span><Button disabled={busy || p.owned || credits < p.price} onClick={() => void trade('buy_praem', { p_listing: p.id })}>{p.owned ? 'You have one' : 'Buy'}</Button></div>)}
    {note && <p role="status" className="font-fell italic">{note}</p>}
  </section>;
}