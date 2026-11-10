import { useEffect, useRef, useState } from 'react';
import { buildPathQueue, progressText, type PathBannerItem } from '@/lib/paths';
import { markPathSeen, usePaths } from '@/hooks/usePaths';

const START_MS = 10000, STEP_MS = 4000, FADE_OUT_MS = 600;
const dialogOpen = () => typeof document !== 'undefined' && !!document.querySelector('[role="dialog"]:not(.path-banner)');

/** Path discovered / step flashes, one at a time, waiting while any NPC dialogue is open. */
export default function PathBanner({ userId, paused = false, ready = true }: { userId?: string | null; paused?: boolean; ready?: boolean }) {
  const paths = usePaths(userId);
  const handled = useRef(new Set<string>());
  const [current, setCurrent] = useState<PathBannerItem | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [blocked, setBlocked] = useState(dialogOpen);

  useEffect(() => {
    const id = setInterval(() => setBlocked(dialogOpen()), 400);
    return () => clearInterval(id);
  }, []);

  const { banners, done } = buildPathQueue(paths);
  useEffect(() => {
    for (const p of done) {
      const key = `${p.quest_key}:done`;
      if (!handled.current.has(key)) { handled.current.add(key); void markPathSeen(p.quest_key, 'done'); }
    }
  });
  const next = banners.find(b => !handled.current.has(`${b.path.quest_key}:${b.path.step_key}`)) ?? null;
  useEffect(() => { if (ready && !current && next && !blocked && !paused) { setLeaving(false); setCurrent(next); } }, [current, next, blocked, paused, ready]);

  const finish = useRef<() => void>(() => undefined);
  finish.current = () => {
    if (!current || leaving) return;
    setLeaving(true);
    const item = current;
    handled.current.add(`${item.path.quest_key}:${item.path.step_key}`);
    setTimeout(() => { setCurrent(null); setLeaving(false); void markPathSeen(item.path.quest_key, item.path.step_key); }, FADE_OUT_MS);
  };
  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => finish.current(), current.kind === 'start' ? START_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [current]);

  if (!ready || !current) return null;
  const { path, kind } = current;
  return <div className={`path-banner path-${path.colour} path-${kind}${leaving ? ' path-leaving' : ''}`} data-game-ui="open" data-no-thumbstick onPointerDown={e => { e.stopPropagation(); finish.current(); }} aria-live="polite">
    {kind === 'start' ? <>
      <p className="path-label font-mono">PATH DISCOVERED</p>
      <p className="path-name font-fell">{path.name}</p>
      {path.line && <p className="path-line font-fell">{path.line}</p>}
      <div className="path-bar"><span style={{ animationDuration: `${START_MS}ms` }} /></div>
    </> : <>
      <p className="path-name path-name-small font-fell">{path.name}</p>
      <p className="path-line font-fell">{path.line}{path.progress && <span className="path-progress"> {progressText(path.progress)}</span>}</p>
    </>}
  </div>;
}
