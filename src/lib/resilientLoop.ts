import { movementDebug } from '@/lib/netQueue';

/**
 * requestAnimationFrame loop that restarts itself on pageshow, on becoming
 * visible, on focus, and when a 1 s watchdog sees no tick for 500 ms while
 * the page is visible (iOS can silently drop rAF after app switching).
 */
export function startResilientLoop(frame: (time: number) => void, track = false): () => void {
  let raf = 0;
  let last = performance.now();
  let stopped = false;
  const tick = (time: number) => {
    if (stopped) return;
    const now = performance.now();
    if (track) { movementDebug.frameMs = Math.round(now - last); movementDebug.lastTickAt = Date.now(); }
    last = now;
    frame(time);
    raf = requestAnimationFrame(tick);
  };
  const restart = () => {
    if (stopped) return;
    cancelAnimationFrame(raf);
    last = performance.now();
    if (track) movementDebug.loopRestarts++;
    raf = requestAnimationFrame(tick);
  };
  const onVisible = () => { if (document.visibilityState === 'visible') restart(); };
  const watchdog = window.setInterval(() => {
    if (document.visibilityState === 'visible' && performance.now() - last > 500) restart();
  }, 1000);
  window.addEventListener('pageshow', restart);
  window.addEventListener('focus', restart);
  document.addEventListener('visibilitychange', onVisible);
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.clearInterval(watchdog);
    window.removeEventListener('pageshow', restart);
    window.removeEventListener('focus', restart);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
