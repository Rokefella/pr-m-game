import { ReactNode, useEffect } from 'react';
import bernardMarker from '@/assets/bernard_marker.svg';

interface Props {
  text: string;
  children?: ReactNode; // action buttons
  onShow?: () => void;
}

const BernardDialogue = ({ text, children, onShow }: Props) => {
  useEffect(() => {
    onShow?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        @keyframes bernardImgIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bernardImgFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes bernardBellFade {
          0% { opacity: 0; transform: translate(-50%, 4px) scale(0.9); }
          30% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -4px) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to top, rgba(4,4,10,0.97) 0%, rgba(4,4,10,0.85) 100%)',
          borderTop: '0.5px solid rgba(91,79,212,0.3)',
          zIndex: 110,
          minHeight: 220,
          display: 'flex',
          padding: '20px 24px 28px',
          gap: 20,
        }}
      >
        {/* Left: Bernard image */}
        <div
          style={{
            width: '40%',
            maxWidth: 280,
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'bernardImgIn 600ms ease-out',
          }}
        >
          {showBell && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                fontSize: 20,
                animation: 'bernardBellFade 600ms ease-out',
                pointerEvents: 'none',
                filter: 'drop-shadow(0 0 6px rgba(200,150,58,0.6))',
              }}
            >
              🔔
            </div>
          )}
          <img
            src={bernardMarker}
            alt="Bernard"
            style={{
              height: 280,
              maxHeight: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom',
              animation: 'bernardImgFloat 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* Right: dialogue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <p className="font-cinzel" style={{ color: '#c8963a', fontSize: 16, letterSpacing: '0.2em', margin: 0 }}>
            Bernard
          </p>
          <p className="font-fell italic" style={{ color: 'rgba(200,185,255,0.95)', fontSize: 16, lineHeight: 1.65, margin: '12px 0 16px' }}>
            {text}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default BernardDialogue;
