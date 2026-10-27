import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useOrbSync } from '@/lib/orb';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import { Button } from '@/components/ui/button';
import PlateFrame, { PlateCorners } from '@/components/theme/PlateFrame';
import PixelEye from '@/components/theme/PixelEye';
import DecodeNumber from '@/components/theme/DecodeNumber';
import FolderSlots from '@/components/theme/FolderSlots';
import { useReducedMotion } from '@/components/theme/useReducedMotion';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import { formatPrime } from '@/lib/format';
import {
  EYE_MS, TYPE_MS_PER_CHAR, DECODE_MS_PER_DIGIT, REVEAL_FLASH_MS,
  REDUCED_REVEAL_MS, FOLDER_TOTAL, countBeforeFragment,
} from '@/lib/theme/fragmentReveal';

interface FragmentOverlayProps {
  prime: number;
  index: number;
  registrationNumber: number;
  onContinue: () => void;
}

const FragmentOverlay = ({ prime, registrationNumber, onContinue }: FragmentOverlayProps) => {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const regLabel = `#${String(registrationNumber).padStart(4, '0')}`;
  const [fullLine, setFullLine] = useState<string | null>(null);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [flashDone, setFlashDone] = useState(false);
  const [reducedReady, setReducedReady] = useState(false);
  const [filled, setFilled] = useState<number | null>(null);
  const [auraColor, setAuraColor] = useState<string | null>(null);
  const [orbDye, setOrbDye] = useState<string | null>(null);
  const [avatarBody, setAvatarBody] = useState<string | null>(null);
  useOrbSync(setAuraColor, setOrbDye, setAvatarBody);
  const [fadingOut, setFadingOut] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEyeOpen(true);
      if (reduced) {
        setRevealed(true);
        setReducedReady(true);
      }
    }, reduced ? REDUCED_REVEAL_MS : EYE_MS);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  // Same carried-only rows and ordering as ProfileOverlay's FOLDER tab. Exclude
  // this prime because Maze may have already persisted the pickup by now.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.from('fragments')
          .select('id,prime_number,collected_at,banked')
          .eq('user_id', user.id).order('collected_at', { ascending: false });
        if (!cancelled && !error && Array.isArray(data)) {
          setFilled(countBeforeFragment(data, prime));
        }
      } catch { /* Unknown counts stay hidden. */ }
    })();
    void (async () => {
      try {
        const { data } = await supabase.from('users').select('aura_color, orb_dye, avatar_body').eq('id', user.id).maybeSingle();
        if (!cancelled) { setAuraColor(data?.aura_color ?? null); setOrbDye((data as { orb_dye?: string | null } | null)?.orb_dye ?? null); setAvatarBody((data as { avatar_body?: string | null } | null)?.avatar_body ?? null); }
      } catch { /* Use the existing default purple palette. */ }
    })();
    return () => { cancelled = true; };
  }, [user, prime]);

  // Pull one random reveal line from the shared `fragment_reveals` table
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
      if (!cancelled) setFullLine(text ?? `${formatPrime(prime)}.`);
    });
    return () => {
      cancelled = true;
    };
  }, [prime]);

  // The eye and fetch must both be ready before typing and decoding begin.
  useEffect(() => {
    if (!eyeOpen || fullLine === null) return;
    if (reduced) {
      setTyped(fullLine);
      setTypingDone(true);
      return;
    }
    let i = 0;
    setTypingDone(fullLine.length === 0);
    const timer = window.setInterval(() => {
      i += 1;
      setTyped(fullLine.slice(0, i));
      if (i >= fullLine.length) {
        setTypingDone(true);
        window.clearInterval(timer);
      }
    }, TYPE_MS_PER_CHAR);
    return () => window.clearInterval(timer);
  }, [eyeOpen, fullLine, reduced]);

  const handleDecoded = useCallback(() => {
    if (!reduced) setRevealed(true);
  }, [reduced]);

  useEffect(() => {
    if (!revealed || reduced) return;
    const timer = window.setTimeout(() => setFlashDone(true), REVEAL_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [revealed, reduced]);

  const canSave = reduced ? reducedReady : revealed && flashDone && typingDone;

  const handleContinue = () => {
    setFadingOut(true);
    window.setTimeout(onContinue, 400);
  };

  const handleCapture = () => {
    // Fragment is already persisted to the folder on collection.
    // Confirm, then continue the original post-collection flow.
    setSavedMsg(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSavedMsg(false);
      handleContinue();
    }, 800);
  };

  return (
    <div className={`fragment-backdrop ${fadingOut ? 'fragment-fading' : ''}`} data-game-ui="open" role="dialog" aria-modal="true" aria-label="Fragment reveal">
      <PlateFrame className="fragment-frame">
        <div className="fragment-stack">
          <PixelEye animate={!reduced} />
          <p className="fragment-voice font-fell italic">{typed}</p>
          <div className="fragment-number-plate">
            <PlateCorners />
            <DecodeNumber value={prime} run={eyeOpen && fullLine !== null} glow={DIMENSION_GLOW.teal} msPerDigit={DECODE_MS_PER_DIGIT} onDone={handleDecoded} />
          </div>
          {filled !== null && <>
            <p className="fragment-caption font-mono">Folder {Math.min(FOLDER_TOTAL, filled + (revealed ? 1 : 0))} of {FOLDER_TOTAL}</p>
            <FolderSlots filled={filled} revealed={revealed} />
          </>}
          <div className="fragment-avatar">
            <PlayerAvatar size={36} palette={orbLook(auraColor, orbDye, registrationNumber)} walking={false} skin={avatarBody} registrationNumber={registrationNumber} auraColor={auraColor} orbDye={orbDye} />
            <div className={`fragment-registration font-mono ${registrationNumber === 1 ? 'fragment-registration-first' : ''}`}>{regLabel}</div>
          </div>
          <Button className="fragment-save font-cinzel" disabled={!canSave || savedMsg} onClick={handleCapture}>SAVE TO FOLDER</Button>
          {savedMsg && <p className="fragment-saved font-fell italic" role="status">Saved to your folder.</p>}
        </div>
      </PlateFrame>
    </div>
  );
};

export default FragmentOverlay;
