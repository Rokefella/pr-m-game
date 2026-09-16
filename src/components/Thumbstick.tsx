import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared floating thumbstick used by every movement screen.
 *
 * - Invisible until touched. Touching anywhere in the lower 40% of the
 *   viewport (excluding interactive controls and the bottom status bar)
 *   places the stick origin at that point.
 * - Drag radius 56px, dead zone 16px, output snapped to 8 directions.
 * - Auto-repeat at 150ms, accelerating to 90ms after 1000ms of hold.
 */

const MAX_RADIUS = 56;
const DEAD_ZONE = 16;
const KNOB_RADIUS = 18;
const BASE_INTERVAL = 150;
const MIN_INTERVAL = 90;
const RAMP_DELAY = 1000;
const RAMP_DURATION = 1000;
const BOTTOM_EXCLUSION = 64; // status bar height
const LOWER_FRACTION = 0.6; // only the lower 40% of the viewport activates

const INTERACTIVE = 'button, a, input, textarea, select, label, [role="button"], [data-no-thumbstick]';

type Dir = -1 | 0 | 1;

export type ThumbstickProps = {
  /** Called once per discrete step, with auto-repeat while held. */
  onMove?: (dc: Dir, dr: Dir) => void;
  /**
   * Called only when the snapped direction changes (and with 0,0 on release).
   * Used by pixel-based screens that run their own movement loop.
   */
  onDirectionChange?: (dc: Dir, dr: Dir) => void;
  disabled?: boolean;
};

const snap8 = (dx: number, dy: number): { dc: Dir; dr: Dir } => {
  const angle = Math.atan2(dy, dx); // -PI..PI, y down
  const sector = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  const table: { dc: Dir; dr: Dir }[] = [
    { dc: 1, dr: 0 },   // E
    { dc: 1, dr: 1 },   // SE
    { dc: 0, dr: 1 },   // S
    { dc: -1, dr: 1 },  // SW
    { dc: -1, dr: 0 },  // W
    { dc: -1, dr: -1 }, // NW
    { dc: 0, dr: -1 },  // N
    { dc: 1, dr: -1 },  // NE
  ];
  return table[sector];
};

const Thumbstick = ({ onMove, onDirectionChange, disabled = false }: ThumbstickProps) => {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onDirRef = useRef(onDirectionChange);
  onDirRef.current = onDirectionChange;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dirRef = useRef<{ dc: Dir; dr: Dir } | null>(null);
  const dirStartRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = useCallback(() => {
    const elapsed = Date.now() - dirStartRef.current;
    let interval = BASE_INTERVAL;
    if (elapsed >= RAMP_DELAY + RAMP_DURATION) {
      interval = MIN_INTERVAL;
    } else if (elapsed > RAMP_DELAY) {
      const t = (elapsed - RAMP_DELAY) / RAMP_DURATION;
      interval = BASE_INTERVAL - (BASE_INTERVAL - MIN_INTERVAL) * t;
    }
    timerRef.current = window.setTimeout(() => {
      const d = dirRef.current;
      if (!d || disabledRef.current) return;
      onMoveRef.current?.(d.dc, d.dr);
      schedule();
    }, interval);
  }, []);

  const setDirection = useCallback(
    (next: { dc: Dir; dr: Dir } | null) => {
      const cur = dirRef.current;
      if (!next) {
        if (cur) {
          dirRef.current = null;
          clearTimer();
          onDirRef.current?.(0, 0);
        }
        return;
      }
      if (cur && cur.dc === next.dc && cur.dr === next.dr) return;
      clearTimer();
      dirRef.current = next;
      dirStartRef.current = Date.now();
      if (!disabledRef.current) {
        onMoveRef.current?.(next.dc, next.dr);
        onDirRef.current?.(next.dc, next.dr);
      }
      schedule();
    },
    [schedule],
  );

  const stop = useCallback(() => {
    activeRef.current = false;
    pointerIdRef.current = null;
    originRef.current = null;
    setDirection(null);
    setOrigin(null);
    setVisible(false);
    setKnob({ x: 0, y: 0 });
  }, [setDirection]);

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  useEffect(() => {
    const isExcluded = (target: EventTarget | null, y: number) => {
      if (y < window.innerHeight * LOWER_FRACTION) return true;
      if (y > window.innerHeight - BOTTOM_EXCLUSION) return true;
      const el = target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest(INTERACTIVE)) return true;
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      if (activeRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (isExcluded(e.target, e.clientY)) return;
      activeRef.current = true;
      pointerIdRef.current = e.pointerId;
      const o = { x: e.clientX, y: e.clientY };
      originRef.current = o;
      setOrigin(o);
      setKnob({ x: 0, y: 0 });
      setVisible(true);
      const el = e.target as Element | null;
      try {
        el?.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
      const o = originRef.current;
      if (!o) return;
      let dx = e.clientX - o.x;
      let dy = e.clientY - o.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }
      setKnob({ x: dx, y: dy });
      if (dist < DEAD_ZONE) {
        setDirection(null);
      } else {
        setDirection(snap8(dx, dy));
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
      stop();
    };

    const preventTouch = (e: TouchEvent) => {
      if (activeRef.current) e.preventDefault();
    };

    const preventTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      if (isExcluded(e.target, t.clientY)) return;
      e.preventDefault();
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd, { passive: false });
    window.addEventListener('pointercancel', onPointerEnd, { passive: false });
    window.addEventListener('touchstart', preventTouchStart, { passive: false });
    window.addEventListener('touchmove', preventTouch, { passive: false });
    window.addEventListener('blur', stop);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('touchstart', preventTouchStart);
      window.removeEventListener('touchmove', preventTouch);
      window.removeEventListener('blur', stop);
      clearTimer();
    };
  }, [setDirection, stop]);

  const noSelect: React.CSSProperties = {
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      aria-hidden
      data-thumbstick
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        pointerEvents: 'none',
        ...noSelect,
      }}
    >
      {origin && (
        <>
          <div
            style={{
              position: 'absolute',
              left: origin.x - MAX_RADIUS,
              top: origin.y - MAX_RADIUS,
              width: MAX_RADIUS * 2,
              height: MAX_RADIUS * 2,
              borderRadius: '50%',
              border: '1px solid rgba(169,140,255,0.35)',
              opacity: visible ? 1 : 0,
              transition: visible ? 'opacity 120ms ease-out' : 'opacity 200ms ease-in',
              pointerEvents: 'none',
              ...noSelect,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: origin.x + knob.x - KNOB_RADIUS,
              top: origin.y + knob.y - KNOB_RADIUS,
              width: KNOB_RADIUS * 2,
              height: KNOB_RADIUS * 2,
              borderRadius: '50%',
              background: 'rgba(169,140,255,0.5)',
              boxShadow: '0 0 16px rgba(169,140,255,0.45)',
              opacity: visible ? 1 : 0,
              transition: visible ? 'opacity 120ms ease-out' : 'opacity 200ms ease-in',
              pointerEvents: 'none',
              ...noSelect,
            }}
          />
        </>
      )}
    </div>
  );
};

export default Thumbstick;
