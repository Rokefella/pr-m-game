import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorldMap from './WorldMap';
import { discoverAround } from '@/lib/worldDiscovery';
vi.mock('@/lib/worldOverview', () => ({ readWorldOverview: () => new Promise(() => {}) }));
vi.mock('react-zoom-pan-pinch', () => ({ TransformWrapper: ({ children }: { children: (v: unknown) => React.ReactNode }) => children({ setTransform: vi.fn(), instance: { state: { scale: 1, positionX: 0, positionY: 0 } } }), TransformComponent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('./theme/useReducedMotion', () => ({ useReducedMotion: () => true }));
afterEach(cleanup);
const places = [{ x: 25, y: 25, name: 'Bernard', kind: 'npc_home' }, { x: 300, y: 300, name: 'Far town', kind: 'town' }, { x: 25, y: 25, name: 'Under town', kind: 'town', layer: 1 }] as never[];
const props = { bits: discoverAround('', 25, 25, 0), player: { x: 25, y: 25 }, layer: 0 as const, aura: null, dev: false, types: [], places, onClose: vi.fn() };
describe('world map visibility', () => {
  it('shows only discovered surface places for normal players and no reveal privilege', () => {
    render(<WorldMap {...props} />);
    expect(screen.getByText('Bernard')).toBeInTheDocument(); expect(screen.queryByText('Far town')).toBeNull(); expect(screen.queryByText('Under town')).toBeNull(); expect(screen.queryByRole('switch', { name: 'Reveal all' })).toBeNull();
  });
  it('registration-one reveal changes presentation without changing discovery', () => {
    render(<WorldMap {...props} dev />); fireEvent.click(screen.getByRole('switch', { name: 'Reveal all' }));
    expect(screen.getByText('Far town')).toBeInTheDocument(); expect(screen.getByText('Discovered 0.1%')).toBeInTheDocument(); expect(props.bits).toBe(discoverAround('', 25, 25, 0));
  });
  it('projects underground position onto the surface at x*4+2,y*4+2', () => {
    render(<WorldMap {...props} layer={1} player={{ x: 25, y: 30 }} />);
    const dot = screen.getByLabelText('Your position'); expect(dot.style.left).toBe('10.2%'); expect(dot.style.top).toBe('12.2%'); expect(screen.getByText('underground')).toBeInTheDocument();
  });
});