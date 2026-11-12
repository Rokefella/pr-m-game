import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Items that are always kept on contact, never offered: fragments, keys and Præms. */
export const keptOnContact = (item: { kind?: string | null; praem?: boolean | null }) => item.kind === 'key' || item.kind === 'fragment' || item.praem === true;

type Props = { name: string; line?: string | null; icon?: string | null; onKeep: () => void; onLeave: () => void };

/** Small card above the player: Keep it (Enter) or Leave it (Esc). Presentation only — callers own the claim. */
export default function KeepCard({ name, line, icon, onKeep, onLeave }: Props) {
  const handlers = useRef({ onKeep, onLeave });
  handlers.current = { onKeep, onLeave };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handlers.current.onKeep(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handlers.current.onLeave(); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);
  return createPortal(
    <div role="dialog" aria-label={name} className="keep-card" data-game-ui>
      {icon && <span className="keep-card-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />}
      <p className="font-cinzel keep-card-name">{name}</p>
      {line && <p className="font-fell italic keep-card-line">{line}</p>}
      <div className="keep-card-actions">
        <button type="button" className="font-mono" onClick={onKeep}>Keep it</button>
        <button type="button" className="font-mono" onClick={onLeave}>Leave it</button>
      </div>
    </div>, document.body);
}
