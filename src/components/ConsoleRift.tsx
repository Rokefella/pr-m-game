import { memo } from 'react';
import { createPortal } from 'react-dom';
import PlateFrame from '@/components/theme/PlateFrame';
import PixelEye from '@/components/theme/PixelEye';
import { Button } from '@/components/ui/button';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import type { RiftTarget } from '@/lib/console';

// TODO: replaced by the real rift transition later.
export default memo(function ConsoleRift({ target, onClose }: { target: RiftTarget; onClose: () => void }) {
  return createPortal(<div className={`console-rift dimension-${target}`} role="dialog" aria-modal="true" aria-label="The rift">
    <PlateFrame width="min(92vw, 340px)" glow={DIMENSION_GLOW[target]}>
      <div className="console-rift-stack"><PixelEye animate glow={DIMENSION_GLOW[target]} />
        <p className="font-fell italic">The {target[0].toUpperCase() + target.slice(1)} dimension is waiting.</p>
        <span className="font-mono">The rift itself arrives soon.</span>
        <Button autoFocus className="auth-submit font-cinzel" onClick={onClose}>CONTINUE</Button>
      </div>
    </PlateFrame>
  </div>, document.body);
});