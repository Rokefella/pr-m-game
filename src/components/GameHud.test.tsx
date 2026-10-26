import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GameHud from './GameHud';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const props = { stepsRemaining: 100, credits: 50, currentLevel: 1, registrationNumber: 1, growthPoints: 0, subscriptionStatus: 'active', trialDaysRemaining: 14, onOpenProfile: vi.fn(), onOpenDevMenu: vi.fn() };
describe('registration dev access', () => {
  it('opens on the fifth rapid tap for registration one only', () => {
    const onOpenDevMenu = vi.fn();
    const view = render(<GameHud {...props} onOpenDevMenu={onOpenDevMenu} />);
    const plate = screen.getByRole('button', { name: 'Registration number' });
    for (let i = 0; i < 4; i++) fireEvent.pointerDown(plate);
    expect(onOpenDevMenu).not.toHaveBeenCalled();
    fireEvent.pointerDown(plate); expect(onOpenDevMenu).toHaveBeenCalledTimes(1);
    view.rerender(<GameHud {...props} registrationNumber={2} onOpenDevMenu={onOpenDevMenu} />);
    for (let i = 0; i < 5; i++) fireEvent.pointerDown(plate);
    expect(onOpenDevMenu).toHaveBeenCalledTimes(1);
  });
  it('resets the tap sequence after a gap longer than 1500 milliseconds', () => {
    const onOpenDevMenu = vi.fn(); const time = vi.spyOn(Date, 'now').mockReturnValue(1000);
    render(<GameHud {...props} onOpenDevMenu={onOpenDevMenu} />);
    const plate = screen.getByRole('button', { name: 'Registration number' });
    for (let i = 0; i < 4; i++) fireEvent.pointerDown(plate);
    time.mockReturnValue(2501); fireEvent.pointerDown(plate);
    expect(onOpenDevMenu).not.toHaveBeenCalled();
  });
});