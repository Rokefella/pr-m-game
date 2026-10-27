import { useRef, type CSSProperties, type ReactNode } from 'react';
import { ProfileButton } from '@/components/ProfileOverlay';
import { Z } from '@/lib/zIndex';
import './game-home.css';
type Props = { stepsRemaining: number; stepsExhausted?: boolean; credits: number; currentLevel: number; registrationNumber: number | null; growthPoints: number; subscriptionStatus: string | null; trialDaysRemaining: number; onOpenProfile: () => void; onOpenDevMenu: () => void; onOpenSupplies?: () => void };
export default function GameHud({ stepsRemaining, stepsExhausted = false, credits, currentLevel, registrationNumber, growthPoints, subscriptionStatus, trialDaysRemaining, onOpenProfile: openProfile, onOpenDevMenu, onOpenSupplies }: Props) {
  const taps = useRef({ count: 0, last: 0 });
  const handleRegTap = () => {
    if (registrationNumber !== 1) return;
    const now = Date.now();
    taps.current.count = now - taps.current.last > 1500 ? 1 : taps.current.count + 1;
    taps.current.last = now;
    if (taps.current.count >= 5) { taps.current.count = 0; onOpenDevMenu(); }
  };
  return <>
      {/* HUD bar */}
      <div
        className="game-hud-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--game-hud-background)',
          borderTop: '0.5px solid var(--game-hud-border)',
          padding: '10px 14px max(10px, env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          zIndex: Z.HUD,
        }}
      >
        <HudCounter label="Add steps" color={stepsExhausted ? 'var(--game-hud-tired)' : 'var(--game-hud-text)'} onTap={onOpenSupplies}>STEPS&nbsp;{String(stepsRemaining).padStart(2, '0')}</HudCounter>
        <HudCounter label="Add credits" color="var(--plate-gold)" onTap={onOpenSupplies}>CREDITS&nbsp;{String(credits).padStart(2, '0')}</HudCounter>
        <span className="font-mono" style={{ fontSize: 13, letterSpacing: 0, color: 'var(--game-hud-level)', whiteSpace: 'nowrap' }}>
          LEVEL&nbsp;{String(currentLevel).padStart(2, '0')}
        </span>
        <ProfileButton onClick={openProfile} />
      </div>

      {/* Trial countdown — shown above HUD while on trial */}
      {subscriptionStatus === 'trial' && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            bottom: 'calc(48px + env(safe-area-inset-bottom))',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--game-trial-text)',
            zIndex: Z.HUD,
            pointerEvents: 'none',
          }}
        >
          {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} remaining in trial
        </div>
      )}

      {/* Registration number — top-right (display only; 5 rapid taps open dev menu) */}
      <div
        role="button" tabIndex={registrationNumber === 1 ? 0 : -1} aria-label="Registration number"
        className="font-mono"
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleRegTap(); }}
        onPointerDown={handleRegTap}
        style={{
          position: 'fixed',
          top: 12,
          right: 14,
          fontSize: 15,
          letterSpacing: '0.22em',
          color: 'var(--game-registration)',
          zIndex: Z.HUD,
          padding: 4,
          userSelect: 'none',
        }}
      >
        #{registrationNumber !== null ? String(registrationNumber).padStart(4, '0') : '????'}
      </div>

      {/* Unspent growth points — top-right, below the registration number */}
      {growthPoints > 0 && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            top: 40,
            right: 14,
            minWidth: 26,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--game-growth-background)',
            border: '0.5px solid var(--game-growth-border)',
            color: 'var(--plate-gold)',
            fontSize: 14,
            letterSpacing: '0.12em',
            zIndex: Z.HUD,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          +{growthPoints}
        </div>
      )}




  </>;
}

/** Tappable HUD number with a small "+" affordance; a button so the thumbstick ignores it. */
export function HudCounter({ label, color, onTap, children, style }: { label: string; color: string; onTap?: () => void; children: ReactNode; style?: CSSProperties }) {
  if (!onTap) return <span className="font-mono" style={{ fontSize: 13, letterSpacing: 0, color, whiteSpace: 'nowrap', ...style }}>{children}</span>;
  return <button type="button" aria-label={label} className="font-mono hud-counter" data-no-thumbstick onClick={onTap} style={{ fontSize: 13, letterSpacing: 0, color, whiteSpace: 'nowrap', ...style }}>{children}<span className="hud-counter-plus" aria-hidden="true">+</span></button>;
}
