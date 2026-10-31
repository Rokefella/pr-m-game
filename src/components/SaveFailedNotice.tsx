import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SAVE_FAILED_EVENT, SAVE_FAILED_TEXT } from '@/lib/saveNotice';

/** One short in-world line, shown above any screen when a save fails. */
export default function SaveFailedNotice() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    const show = () => { setShown(true); window.clearTimeout(timer); timer = window.setTimeout(() => setShown(false), 3500); };
    window.addEventListener(SAVE_FAILED_EVENT, show);
    return () => { window.removeEventListener(SAVE_FAILED_EVENT, show); window.clearTimeout(timer); };
  }, []);
  if (!shown) return null;
  return createPortal(<div role="status" aria-live="polite" data-game-ui="open" className="save-failed-notice font-fell italic">{SAVE_FAILED_TEXT}</div>, document.body);
}
