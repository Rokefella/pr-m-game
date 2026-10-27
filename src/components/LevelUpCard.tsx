import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PlateFrame, { PlateCorners } from '@/components/theme/PlateFrame';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import { useReducedMotion } from '@/components/theme/useReducedMotion';
import './game-home.css';
import { TITLES_BY_LEVEL } from '@/lib/playerTitles';
export { TITLES_BY_LEVEL } from '@/lib/playerTitles';

type Props = { newLevel: number; titleUnlocked: boolean; auraColor: string | null; orbDye?: string | null; registrationNumber: number | null; avatarBody?: string | null; onContinue: () => Promise<void>; home?: 'world' | 'village' };
export default function LevelUpCard({ newLevel, titleUnlocked, auraColor, orbDye, registrationNumber, avatarBody, onContinue, home = 'village' }: Props) {
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const title = TITLES_BY_LEVEL[newLevel];
  const proceed = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try { await onContinue(); } catch { setError(true); setBusy(false); }
  };
  return <div className={`fragment-backdrop game-arrival ${reduced ? 'game-arrival-static' : ''}`} data-game-ui="open" role="dialog" aria-label="Level arrival">
    <PlateFrame glow="var(--plate-gold)" width="min(92vw, 340px)">
      <div className="game-arrival-content">
        <h2 className="font-cinzel">LEVEL {String(newLevel).padStart(2, '0')}</h2>
        <hr />
        <p className="font-fell italic">{home === 'world' ? 'The world is different now.' : 'The village is different now.'}</p>
        <div className="game-arrival-avatar"><PlayerAvatar palette={orbLook(auraColor, orbDye, registrationNumber)} size={64} walking={false} skin={avatarBody} registrationNumber={registrationNumber} auraColor={auraColor} orbDye={orbDye} /></div>
        {titleUnlocked && title && <div className="game-arrival-title"><PlateCorners /><span className="font-mono">TITLE UNLOCKED</span><p className="font-cinzel">{title}</p></div>}
        {error && <p className="font-fell" role="alert">Please try again.</p>}
        <Button className="game-arrival-continue font-cinzel" disabled={busy} onClick={() => void proceed()}>{busy ? '…' : 'CONTINUE'}</Button>
      </div>
    </PlateFrame>
  </div>;
}
