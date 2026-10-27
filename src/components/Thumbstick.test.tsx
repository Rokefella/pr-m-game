import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Thumbstick from './Thumbstick';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('never starts walking or cancels taps anywhere in an NPC dialog', () => {
  const move = vi.fn();
  const { getByRole } = render(<><Thumbstick onMove={move} /><section role="dialog" aria-label="Sam"><p>Card background</p><button>I'll go</button></section></>);
  const card = getByRole('dialog');
  const event = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: [{ clientX: 100, clientY: 700, identifier: 1 }] });
  card.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
  fireEvent.pointerDown(getByRole('button'), { clientX: 100, clientY: 700 }); expect(move).not.toHaveBeenCalled();
});