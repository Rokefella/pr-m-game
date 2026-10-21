import { memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LABEL_NAME_PX, LABEL_TITLE_PX, labelPositions, truncateOrbText } from '@/lib/orbLabelGeometry';
export { LABEL_NAME_PX, LABEL_TITLE_PX } from '@/lib/orbLabelGeometry';

const trackers = new Set<() => void>();
let frame = 0;
function track(draw: () => void) {
  trackers.add(draw);
  if (!frame) {
    const tick = () => { trackers.forEach(fn => fn()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
  }
  return () => { trackers.delete(draw); if (!trackers.size) { cancelAnimationFrame(frame); frame = 0; } };
}

export function orbName(name?: string | null) {
  return truncateOrbText(name, 12);
}

export default memo(function OrbLabels({ title, name, size, kind = 'avatar', target, opacity }: { title?: string | null; name?: string | null; size: number; kind?: 'avatar' | 'npc' | 'dot'; target?: () => Element | null; opacity?: () => number }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;
  const shownTitle = truncateOrbText(title, 18);
  const shownName = orbName(name);
  useEffect(() => {
    if (!shownTitle && !shownName) return;
    return track(() => {
      const parent = anchor.current?.parentElement;
      const node = targetRef.current?.() ?? parent?.querySelector('svg') ?? parent;
      if (!node) return;
      const bounds = node.getBoundingClientRect();
      const p = labelPositions(bounds, kind);
      const visible = bounds.width > 0 && bounds.height > 0 && p.x >= -100 && p.x <= window.innerWidth + 100 && p.nameY >= -100 && p.titleY <= window.innerHeight + 100;
      if (titleRef.current) { titleRef.current.style.transform = `translate(${p.x}px, ${p.titleY}px) translate(-50%, -100%)`; titleRef.current.style.visibility = visible ? 'visible' : 'hidden'; }
      if (nameRef.current) { nameRef.current.style.transform = `translate(${p.x}px, ${p.nameY}px) translateX(-50%)`; nameRef.current.style.visibility = visible ? 'visible' : 'hidden'; }
      if (opacityRef.current) {
        const alpha = String(opacityRef.current());
        if (titleRef.current) titleRef.current.style.opacity = alpha;
        if (nameRef.current) nameRef.current.style.opacity = alpha;
      }
    });
  }, [shownTitle, shownName, size, kind]);
  if (!shownTitle && !shownName) return null;
  return <>
    <span ref={anchor} className="orb-label-anchor" aria-hidden="true" />
    {createPortal(<div className="orb-label-overlay" data-scene={window.location.pathname.startsWith('/maze') ? 'maze' : window.location.pathname.includes('shadow') ? 'shadow' : window.location.pathname.startsWith('/village') ? 'village' : 'room'}>
      {shownTitle && <span ref={titleRef} className="orb-label orb-label-title font-fell italic" style={{ fontSize: LABEL_TITLE_PX }}>{shownTitle}</span>}
      {shownName && <span ref={nameRef} className="orb-label orb-label-name font-fell" style={{ fontSize: LABEL_NAME_PX }}>{shownName}</span>}
    </div>, document.body)}
  </>;
});