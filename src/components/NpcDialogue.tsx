import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import NpcPortrait from '@/components/NpcPortrait';
import { buttonVariants } from '@/components/ui/button';
import { NPC_DIALOGUE_CLOSED } from '@/hooks/useNpcQuestStates';
import { cn } from '@/lib/utils';
import '@/pages/world-test.css';

interface Props {
  text: string;
  /** Display name shown above the dialogue text (e.g. "Sam", "The Banker"). */
  npcName: string;
  /** Internal NPC key used to find the skin; falls back to the name. */
  npcKey?: string;
  /** Legacy portrait asset (unused: portraits come from the NPC's skin). */
  npcPortraitSrc?: string;
  children?: ReactNode; // action buttons
  onShow?: () => void;
}

/** Callers' buttons are restyled to the world card's buttons so every NPC card looks the same. */
const asCardButton = (child: ReactNode, index: number) => {
  if (!isValidElement(child)) return child;
  const el = child as ReactElement<{ className?: string; style?: unknown }>;
  return cloneElement(el, { style: undefined, className: cn(buttonVariants({ variant: index === 0 ? 'default' : 'outline' }), 'world-jump npc-card-action') });
};

// Portaled to body so transformed world containers never size the card.
const NpcDialogue = ({ text, npcName, npcKey, children, onShow }: Props) => {
  useEffect(() => {
    onShow?.();
    return () => { window.dispatchEvent(new Event(NPC_DIALOGUE_CLOSED)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="world-dialog-backdrop" data-game-ui="open" data-no-thumbstick>
      <section className="world-dialog world-place-card" role="dialog" aria-label={npcName}>
        <NpcPortrait npc={npcKey || npcName} />
        <h2 className="font-cinzel">{npcName}</h2>
        <p className="font-fell">{text}</p>
        <div className="npc-card-actions">{Children.toArray(children).map(asCardButton)}</div>
      </section>
    </div>,
    document.body
  );
};

export default NpcDialogue;
