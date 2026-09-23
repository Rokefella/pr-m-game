import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface FragmentOverlayProps {
  prime: number;
  index: number;
  registrationNumber: number;
  onContinue: () => void;
}

const FragmentOverlay = ({ prime, index, registrationNumber, onContinue }: FragmentOverlayProps) => {
  const regLabel = `#${String(registrationNumber).padStart(4, '0')}`;
  const [fullLine, setFullLine] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0);
  const [eyeRy, setEyeRy] = useState(2);
  const [typed, setTyped] = useState('');
  const [showPrime, setShowPrime] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const savedTimerRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // bg fade-in
    requestAnimationFrame(() => setBgOpacity(1));

    // eye opens over 800ms
    const eyeStart = performance.now();
    let raf = 0;
    const animateEye = (t: number) => {
      const p = Math.min(1, (t - eyeStart) / 800);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setEyeRy(2 + (36 - 2) * eased);
      if (p < 1) raf = requestAnimationFrame(animateEye);
    };
    raf = requestAnimationFrame(animateEye);

    return () => {
      cancelAnimationFrame(raf);
et line from the shared `fragment_reveals` table
  useEffect(() => {
    let cancelled = false;
    const fetchRandomReveal = async (): Promise<string | null> => {
      try {
        const { data, error } = await supabase
          .from('fragment_reveals' as never)
          .select('text')
          .order('random()' as never)
          .limit(1)
          .single();
        if (!error && data) return (data as { text?: string }).text ?? null;
        const { data: pool } = await supabase
          .from('fragment_reveals' as never)
          .select('text')
          .limit(100);
        const rows = (pool as { text?: string }[] | null) ?? [];
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)]?.text ?? null;
      } catch {
        return null;
      }
    };
    void fetchRandomReveal().then((text) => {
      if (!cancelled) setFullLine(text ?? `${prime}.`);
    });
    return () => {
      cancelled = true;
    };
  }, [prime]);

  // Typing starts after the eye opens (800ms) and only once the reveal line
  // has resolved — if the fetch is slow, typing simply waits for it.
  useEffect(() => {
    if (fullLine === null) return;

    let typeTimer: number | undefined;
    let primeTimer: number | undefined;
    let buttonsTimer: number | undefined;
    const typeStart = window.setTimeout(() => {
      let i = 0;
      const tick = () => {
        i += 1;
        setTyped(fullLine.slice(0, i));
        if (i < fullLine.length) {
          typeTimer = window.setTimeout(tick, 35);
        } else {
          // 400ms pause then prime
          primeTimer = window.setTimeout(() => {
            setShowPrime(true);
            // 500ms after prime → buttons
            buttonsTimer = window.setTimeout(() => setShowButtons(true), 500);
          }, 400);
        }
      };
      tick();
    }, 800);

    return () => {
      window.clearTimeout(typeStart);
      if (typeTimer) window.clearTimeout(typeTimer);
      if (primeTimer) window.clearTimeout(primeTimer);
      if (buttonsTimer) window.clearTimeout(buttonsTimer);
    };
  }, [fullLine]);
