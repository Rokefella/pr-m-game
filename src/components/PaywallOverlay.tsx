import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { purchaseTier, type PurchaseTier } from '@/lib/purchase';
import { setFlag } from '@/lib/questFlags';

type Props = {
  userId: string;
  onContinue: () => void;
  onDismiss: () => void;
};

type Tier = PurchaseTier;

const FOUNDING_CAP = 500;

const PaywallOverlay = ({ userId, onContinue, onDismiss }: Props) => {
  const [stage, setStage] = useState(0);
  const [lifetimeRemaining, setLifetimeRemaining] = useState<number>(FOUNDING_CAP);
  const [pending, setPending] = useState<Tier | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStage(1), 800);
    const t2 = window.setTimeout(() => setStage(2), 1600);
    const t3 = window.setTimeout(() => setStage(3), 2400);
    return () => { [t1, t2, t3].forEach(window.clearTimeout); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_tier', 'founding');
      if (cancelled || error) return;
      setLifetimeRemaining(Math.max(0, FOUNDING_CAP - (count ?? 0)));
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubscribe = async (tier: Tier) => {
    if (pending) return;
    setErrorMsg(null);
    setPending(tier);
    try {
      await purchaseTier(userId, tier);
      // Mark Find Alexandra quest as pending — Bernard triggers on next contact
      await setFlag(userId, 'quest_alexandra_pending', 'true');
      onContinue();
    } catch (e: any) {
      console.error('[PaywallOverlay] purchase error', e);
      setErrorMsg(e?.message || 'Purchase could not be completed.');
    } finally {
      setPending(null);
    }
  };

  const showLifetime = lifetimeRemaining > 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#04040a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: '32px 20px', overflow: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(91,79,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,79,212,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 720, width: '100%' }}>
        <svg width={80} height={48} viewBox="-40 -24 80 48">
          <ellipse cx={0} cy={0} rx={40} ry={24} stroke="rgba(160,140,200,0.5)" strokeWidth={1} fill="none" />
          <circle cx={0} cy={0} r={6} fill="#5b4fd4" />
        </svg>

        {stage >= 1 && (
          <p className="font-fell italic" style={{ fontSize: 20, color: 'rgba(160,140,200,0.9)', textAlign: 'center', margin: 0 }}>
            You have found your way through the first dimension.
          </p>
        )}
        {stage >= 2 && (
          <p className="font-fell italic" style={{ fontSize: 16, color: 'rgba(160,140,200,0.6)', textAlign: 'center', margin: 0 }}>
            What comes next requires commitment.
          </p>
        )}

        {stage >= 3 && (
          <>
            <div
              style={{
                marginTop: 16, width: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
                gap: 14,
              }}
            >
              {/* MONTHLY */}
              <div style={{ border: '0.5px solid rgba(160,140,200,0.25)', background: 'rgba(100,80,160,0.04)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(160,140,200,0.5)', margin: 0 }}>MONTHLY</p>
                <p className="font-cinzel" style={{ fontSize: 32, color: 'rgba(200,185,255,0.9)', margin: '8px 0 0', lineHeight: 1 }}>€2.99</p>
                <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(160,140,200,0.5)', margin: 0 }}>per month</p>
                <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', margin: 0 }}>Cancel any time</p>
                <button
                  type="button"
                  onClick={() => handleSubscribe('monthly')}
                  className="font-cinzel"
                  style={{
                    marginTop: 12, fontSize: 11, letterSpacing: '0.22em',
                    color: 'rgba(160,140,200,0.8)', background: 'transparent',
                    border: '0.5px solid rgba(160,140,200,0.4)',
                    padding: '10px 24px', cursor: 'pointer',
                  }}
                >
                  START MONTHLY
                </button>
              </div>

              {/* YEARLY */}
              <div style={{ border: '1px solid #5b4fd4', background: 'rgba(91,79,212,0.08)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.22em', color: '#a98cff', margin: 0 }}>YEARLY</p>
                <p className="font-cinzel" style={{ fontSize: 32, color: '#e0ddd5', margin: '8px 0 0', lineHeight: 1 }}>€24.99</p>
                <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(200,185,255,0.7)', margin: 0 }}>per year</p>
                <p className="font-fell italic" style={{ fontSize: 12, color: '#a98cff', margin: 0 }}>Save 38%</p>
                <button
                  type="button"
                  onClick={() => handleSubscribe('annual')}
                  className="font-cinzel"
                  style={{
                    marginTop: 12, fontSize: 11, letterSpacing: '0.22em',
                    color: '#ffffff', background: '#5b4fd4',
                    border: 'none', padding: '10px 24px', cursor: 'pointer',
                  }}
                >
                  START YEARLY
                </button>
              </div>

              {/* LIFETIME */}
              {showLifetime && (
                <div style={{ border: '0.5px solid rgba(200,150,58,0.4)', background: 'rgba(200,150,58,0.05)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.22em', color: '#c8963a', margin: 0 }}>LIFETIME</p>
                  <p className="font-cinzel" style={{ fontSize: 32, color: '#c8963a', margin: '8px 0 0', lineHeight: 1 }}>€9.99</p>
                  <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(200,150,58,0.7)', margin: 0 }}>once, forever</p>
                  <p className="font-mono" style={{ fontSize: 11, color: 'rgba(200,150,58,0.8)', margin: 0 }}>
                    {lifetimeRemaining} of 500 remaining
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSubscribe('founding')}
                    className="font-cinzel"
                    style={{
                      marginTop: 12, fontSize: 11, letterSpacing: '0.22em',
                      color: '#04040a', background: '#c8963a',
                      border: 'none', padding: '10px 24px', cursor: 'pointer',
                    }}
                  >
                    GO LIFETIME
                  </button>
                </div>
              )}
            </div>

            {/* FREE — testing only */}
            <div style={{ marginTop: 18, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px', border: '0.5px dashed rgba(160,140,200,0.15)' }}>
              <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(160,140,200,0.4)', margin: 0 }}>FREE</p>
              <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', margin: 0 }}>Testing access — will be removed</p>
              <button
                type="button"
                onClick={async () => {
                  await setFlag(userId, 'quest_alexandra_pending', 'true');
                  onContinue();
                }}
                className="font-cinzel"
                style={{
                  marginTop: 4, fontSize: 11, letterSpacing: '0.22em',
                  color: 'rgba(160,140,200,0.4)', background: 'transparent',
                  border: '0.5px solid rgba(160,140,200,0.2)',
                  padding: '10px 24px', cursor: 'pointer',
                }}
              >
                CONTINUE FREE
              </button>
              <p className="font-mono" style={{ fontSize: 9, color: 'rgba(160,140,200,0.2)', margin: 0 }}>// DEV ONLY — remove before launch</p>
            </div>

            {errorMsg && (
              <p className="font-fell italic" style={{ fontSize: 13, color: 'rgba(220,120,120,0.9)', textAlign: 'center', margin: '16px 0 0', maxWidth: 460 }}>
                {errorMsg}
              </p>
            )}

            <p className="font-fell italic" style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: '20px 0 0', maxWidth: 460 }}>
              Your registration number, Trace, and title are yours regardless.
            </p>

            <button
              type="button"
              onClick={onDismiss}
              className="font-cinzel"
              style={{
                marginTop: 18, fontSize: 11, letterSpacing: '0.22em',
                color: 'rgba(160,140,200,0.3)', background: 'transparent',
                border: 'none', padding: '6px 12px', cursor: 'pointer',
              }}
            >
              Not yet — return to the Village.
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaywallOverlay;
