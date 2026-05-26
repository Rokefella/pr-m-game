import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { initRevenueCat, getOffering, purchasePackage, restorePurchases } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

type Tier = 'founding' | 'monthly' | 'annual' | null;

const TIER_CONFIG: Record<Exclude<Tier, null>, { cx: number; color: string }> = {
  founding: { cx: -12, color: '#c8963a' },
  monthly: { cx: 0, color: '#5b4fd4' },
  annual: { cx: 12, color: 'rgba(34,197,94,0.9)' },
};

const Paywall = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eyeVisible, setEyeVisible] = useState(false);
  const [activeTier, setActiveTier] = useState<Tier>(null);
  const [thanksTier, setThanksTier] = useState<Tier>(null);
  const [idleCx, setIdleCx] = useState(0);
  const [packages, setPackages] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setEyeVisible(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await initRevenueCat(user.id);
        const offering = await getOffering();
        if (offering) {
          const map: Record<string, any> = {};
          for (const pkg of offering.availablePackages) {
            map[pkg.identifier] = pkg;
          }
          setPackages(map);
        }
      } catch (e) {
        console.error('[Paywall] init error', e);
      }
    })();
  }, [user]);

  // Idle drift when no tier selected
  useEffect(() => {
    if (activeTier !== null) return;
    let dir = 1;
    const interval = window.setInterval(() => {
      setIdleCx((prev) => {
        const next = prev + dir * 4;
        if (next >= 4) dir = -1;
        if (next <= -4) dir = 1;
        return Math.max(-4, Math.min(4, next));
      });
    }, 1500);
    return () => window.clearInterval(interval);
  }, [activeTier]);

  const pupilCx = activeTier ? TIER_CONFIG[activeTier].cx : idleCx;
  const pupilColor = activeTier ? TIER_CONFIG[activeTier].color : '#5b4fd4';

  const tierToPackageId: Record<Exclude<Tier, null>, string> = {
    founding: 'lifetime',
    monthly: 'monthly',
    annual: 'yearly',
  };

  const handleBegin = async (tier: Exclude<Tier, null>) => {
    setErrorMsg(null);
    if (!user) {
      setErrorMsg('You must be signed in.');
      return;
    }
    const pkg = packages[tierToPackageId[tier]];
    if (!pkg) {
      setErrorMsg('This option is unavailable right now.');
      return;
    }
    try {
      await purchasePackage(pkg);
      await supabase
        .from('users')
        .update({ subscription_status: 'active', subscription_tier: tier })
        .eq('id', user.id);
      setThanksTier(tier);
      navigate('/village');
    } catch (e: any) {
      console.error('[Paywall] purchase error', e);
      setErrorMsg(e?.message || 'Purchase could not be completed.');
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    if (!user) return;
    try {
      const ci: any = await restorePurchases();
      if (ci?.entitlements?.active?.['praem_access']) {
        await supabase
          .from('users')
          .update({ subscription_status: 'active' })
          .eq('id', user.id);
        navigate('/village');
      } else {
        setErrorMsg('No purchases to restore.');
      }
    } catch (e: any) {
      console.error('[Paywall] restore error', e);
      setErrorMsg(e?.message || 'Restore failed.');
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto"
      style={{ backgroundColor: '#04040a' }}
    >
      {/* Purple grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(91,79,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,79,212,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 pt-16 pb-12">
        {/* Headline */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 22,
            color: 'rgba(160,140,200,0.9)',
            textAlign: 'center',
          }}
        >
          The spiral continues.
        </p>

        {/* Sub text */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 14,
            color: 'rgba(160,140,200,0.5)',
            marginTop: 12,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Your trial has ended. Subscribe to keep navigating.
        </p>

        {/* Tracking Eye */}
        <svg
          width="60"
          height="36"
          viewBox="-30 -18 60 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            opacity: eyeVisible ? 1 : 0,
            transition: 'opacity 800ms ease-out',
          }}
        >
          <ellipse
            cx="0"
            cy="0"
            rx="28"
            ry="16"
            stroke="rgba(160,140,200,0.5)"
            strokeWidth="0.8"
            fill="none"
          />
          <circle
            cx={pupilCx}
            cy="0"
            r="6"
            fill={pupilColor}
            style={{
              transition: 'cx 400ms ease-in-out, fill 400ms ease-in-out',
            }}
          />
        </svg>

        {/* Tier Cards */}
        <div style={{ width: '100%', marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Founding Member */}
          <div
            onMouseEnter={() => setActiveTier('founding')}
            onMouseLeave={() => setActiveTier(null)}
            onTouchStart={() => setActiveTier('founding')}
            style={{
              border: `1px solid ${activeTier === 'founding' ? 'rgba(200,150,58,0.6)' : 'rgba(200,150,58,0.3)'}`,
              background: 'rgba(200,150,58,0.04)',
              padding: '20px 18px',
              transition: 'border-color 300ms ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <span
                className="font-cinzel"
                style={{
                  fontSize: 7,
                  letterSpacing: '0.2em',
                  background: 'rgba(200,150,58,0.15)',
                  border: '0.5px solid rgba(200,150,58,0.4)',
                  color: '#c8963a',
                  padding: '3px 10px',
                }}
              >
                FIRST 500 ONLY
              </span>
            </div>
            <p
              className="font-cinzel"
              style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,150,58,0.6)', textAlign: 'center', margin: 0 }}
            >
              FOUNDING MEMBER
            </p>
            <p
              className="font-cinzel"
              style={{ fontSize: 36, color: '#c8963a', lineHeight: 1, marginTop: 8, textAlign: 'center', margin: '8px 0 0' }}
            >
              €9.99
            </p>
            <p
              className="font-fell italic"
              style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', marginTop: 4, textAlign: 'center', margin: '4px 0 0' }}
            >
              once. forever.
            </p>
            <ul
              className="font-fell italic"
              style={{
                fontSize: 11,
                color: 'rgba(160,140,200,0.55)',
                lineHeight: 1.8,
                marginTop: 12,
                listStyle: 'none',
                padding: 0,
              }}
            >
              <li>· Lifetime access — no subscription</li>
              <li>· "First One Here" title — permanent</li>
              <li>· Registration #1–500 locked forever</li>
              <li>· All future levels included</li>
            </ul>
            <button
              type="button"
              onClick={() => handleBegin('founding')}
              className="font-cinzel"
              style={{
                background: '#c8963a',
                color: '#04040a',
                fontSize: 10,
                letterSpacing: '0.25em',
                padding: '10px 0',
                marginTop: 16,
                width: '100%',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              BEGIN
            </button>
            {thanksTier === 'founding' && (
              <p
                className="font-fell italic"
                style={{ fontSize: 13, color: 'rgba(160,140,200,0.5)', marginTop: 12, textAlign: 'center' }}
              >
                Payment coming soon. Thank you for your interest.
              </p>
            )}
          </div>

          {/* Monthly */}
          <div
            onMouseEnter={() => setActiveTier('monthly')}
            onMouseLeave={() => setActiveTier(null)}
            onTouchStart={() => setActiveTier('monthly')}
            style={{
              border: `0.5px solid ${activeTier === 'monthly' ? 'rgba(100,80,160,0.6)' : 'rgba(100,80,160,0.2)'}`,
              background: 'rgba(100,80,160,0.03)',
              padding: '20px 18px',
              transition: 'border-color 300ms ease',
            }}
          >
            <p
              className="font-cinzel"
              style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: 0 }}
            >
              MONTHLY
            </p>
            <p
              className="font-cinzel"
              style={{ fontSize: 36, color: 'rgba(160,140,200,0.85)', lineHeight: 1, textAlign: 'center', margin: '8px 0 0' }}
            >
              €2.99
            </p>
            <p
              className="font-fell italic"
              style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: '4px 0 0' }}
            >
              per month
            </p>
            <ul
              className="font-fell italic"
              style={{
                fontSize: 11,
                color: 'rgba(160,140,200,0.55)',
                lineHeight: 1.8,
                marginTop: 12,
                listStyle: 'none',
                padding: 0,
              }}
            >
              <li>· Full game access</li>
              <li>· Cancel anytime</li>
              <li>· All future levels</li>
            </ul>
            <button
              type="button"
              onClick={() => handleBegin('monthly')}
              className="font-cinzel"
              style={{
                background: 'rgba(91,79,212,0.8)',
                color: '#ffffff',
                fontSize: 10,
                letterSpacing: '0.25em',
                padding: '10px 0',
                marginTop: 16,
                width: '100%',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              BEGIN
            </button>
            {thanksTier === 'monthly' && (
              <p
                className="font-fell italic"
                style={{ fontSize: 13, color: 'rgba(160,140,200,0.5)', marginTop: 12, textAlign: 'center' }}
              >
                Payment coming soon. Thank you for your interest.
              </p>
            )}
          </div>

          {/* Annual */}
          <div
            onMouseEnter={() => setActiveTier('annual')}
            onMouseLeave={() => setActiveTier(null)}
            onTouchStart={() => setActiveTier('annual')}
            style={{
              border: `0.5px solid ${activeTier === 'annual' ? 'rgba(34,197,94,0.4)' : 'rgba(100,80,160,0.2)'}`,
              background: 'rgba(100,80,160,0.03)',
              padding: '20px 18px',
              transition: 'border-color 300ms ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <span
                className="font-cinzel"
                style={{
                  fontSize: 7,
                  letterSpacing: '0.15em',
                  background: 'rgba(34,197,94,0.1)',
                  border: '0.5px solid rgba(34,197,94,0.3)',
                  color: 'rgba(34,197,94,0.7)',
                  padding: '3px 10px',
                }}
              >
                SAVE 30%
              </span>
            </div>
            <p
              className="font-cinzel"
              style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: 0 }}
            >
              ANNUAL
            </p>
            <p
              className="font-cinzel"
              style={{ fontSize: 36, color: 'rgba(160,140,200,0.85)', lineHeight: 1, textAlign: 'center', margin: '8px 0 0' }}
            >
              €25
            </p>
            <p
              className="font-fell italic"
              style={{ fontSize: 12, color: 'rgba(160,140,200,0.4)', textAlign: 'center', margin: '4px 0 0' }}
            >
              per year
            </p>
            <ul
              className="font-fell italic"
              style={{
                fontSize: 11,
                color: 'rgba(160,140,200,0.55)',
                lineHeight: 1.8,
                marginTop: 12,
                listStyle: 'none',
                padding: 0,
              }}
            >
              <li>· €2.08/month effectively</li>
              <li>· Full game access</li>
              <li>· All future levels</li>
              <li>· Best value</li>
            </ul>
            <button
              type="button"
              onClick={() => handleBegin('annual')}
              className="font-cinzel"
              style={{
                background: 'rgba(91,79,212,0.8)',
                color: '#ffffff',
                fontSize: 10,
                letterSpacing: '0.25em',
                padding: '10px 0',
                marginTop: 16,
                width: '100%',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              BEGIN
            </button>
            {thanksTier === 'annual' && (
              <p
                className="font-fell italic"
                style={{ fontSize: 13, color: 'rgba(160,140,200,0.5)', marginTop: 12, textAlign: 'center' }}
              >
                Payment coming soon. Thank you for your interest.
              </p>
            )}
          </div>
        </div>

        {/* Restore purchase */}
        <button
          type="button"
          className="font-cinzel"
          style={{
            marginTop: 24,
            fontSize: 9,
            color: 'rgba(160,140,200,0.2)',
            letterSpacing: '0.15em',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          RESTORE PURCHASE
        </button>

        <p
          className="font-fell italic"
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'rgba(160,140,200,0.3)',
            textAlign: 'center',
          }}
        >
          Cancel anytime. No commitment.
        </p>
      </div>
    </div>
  );
};

export default Paywall;
