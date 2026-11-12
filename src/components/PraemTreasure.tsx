import { useEffect } from 'react';
import { praemTone, praemVisible, ringClass } from '@/lib/praems';
import DropIcon from './DropIcon';
export function PraemTreasure({ cell, player, tone }: { cell: { col: number; row: number }; player: { col: number; row: number }; tone: string }) {
  if (!praemVisible(cell, player)) return null;
  return <div className={`praem-treasure ${ringClass(tone)}`} aria-label="Præm treasure"><span className="praem-floor-shimmer" /><span className="praem-glass-orb" /></div>;
}
export function PraemHum({ nearby }: { nearby: boolean }) {
  useEffect(() => {
    if (!nearby) return;
    const root = document.documentElement; root.classList.add('praem-humming');
    praemTone(); const timer = setInterval(() => praemTone(), 3000);
    return () => { clearInterval(timer); root.classList.remove('praem-humming'); };
  }, [nearby]);
  return null;
}
export function PraemReceipt({ name, icon }: { name: string; icon?: string | null }) {
  return <div role="status" className="praem-receipt"><DropIcon svg={icon} size={48} /><h2 className="font-cinzel">{name}</h2><p className="font-fell italic">It sleeps. Carry it home to the Shadow Realm.</p></div>;
}