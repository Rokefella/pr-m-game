import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DevNotepad, { DevNotepadPanel } from './DevNotepad';
import { DRAFT_KEY } from '@/lib/devNotes';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), registration: 1, user: { id: 'rob' } as { id: string } | null }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { registration_number: mocks.registration }, error: null }) }) }) }) } }));
vi.mock('@/lib/devNoteCapture', () => ({ captureDevNote: async () => ({ shot: 'data:image/jpeg;base64,shot', thumb: 'data:image/jpeg;base64,thumb' }) }));
afterEach(() => { cleanup(); localStorage.clear(); mocks.rpc.mockReset(); mocks.registration = 1; mocks.user = { id: 'rob' }; });
describe('notepad controls', () => {
  it('hides every control from other registrations and signed-out players', async () => { mocks.registration = 2; const r = render(<MemoryRouter initialEntries={['/world']}><DevNotepad /></MemoryRouter>); await waitFor(() => expect(screen.queryByLabelText('Open dev notepad')).toBeNull()); r.unmount(); mocks.user = null; render(<MemoryRouter initialEntries={['/intro']}><DevNotepad /></MemoryRouter>); expect(screen.queryByLabelText('Open dev notepad')).toBeNull(); });
  it('saves text using Cmd+Enter, clears the draft and stays open', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'dev_note_add' ? 123 : [], error: null }));
    render(<DevNotepadPanel route="/world" />); fireEvent.click(screen.getByLabelText('Open dev notepad'));
    const field = screen.getByLabelText('Dev note'); expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: 'Test wall' } }); expect(localStorage.getItem(DRAFT_KEY)).toBe('Test wall');
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
    await screen.findByText('Saved #123'); expect(field).toHaveValue(''); expect(screen.getByRole('dialog')).toBeVisible();
    expect(mocks.rpc).toHaveBeenCalledWith('dev_note_add', expect.objectContaining({ p_note: 'Test wall', p_route: '/world' }));
    expect(mocks.rpc).toHaveBeenCalledWith('dev_notes_list', { p_limit: 15 });
  });
  it('keeps unsaved text after close and reopen and blocks game shortcuts only with focus', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null }); render(<DevNotepadPanel route="/maze" />);
    fireEvent.click(screen.getByLabelText('Open dev notepad')); const field = screen.getByLabelText('Dev note'); fireEvent.change(field, { target: { value: 'keep this' } });
    const move = vi.fn(); window.addEventListener('keydown', move);
    fireEvent.keyDown(field, { key: 'ArrowRight' }); expect(move).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body); fireEvent.keyDown(window, { key: 'ArrowRight' }); expect(move).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Open dev notepad')); expect(screen.getByLabelText('Dev note')).toHaveValue('keep this'); window.removeEventListener('keydown', move);
  });
  it('attaches a screenshot without text and supports edit and drop RPCs', async () => {
    let rows = [{ id: 7, created_at: '2026-10-27T13:38:00Z', note: 'wall', route: '/world', x: 838, y: 267, layer: 0, claude_note: 'Answered', thumb: null }];
    mocks.rpc.mockImplementation(async (name: string) => { if (name === 'dev_note_drop') rows = []; return { data: name === 'dev_notes_list' ? rows : 8, error: null }; });
    render(<DevNotepadPanel route="/world" />); fireEvent.click(screen.getByLabelText('Screenshot and note')); await screen.findByAltText('Attached screenshot');
    fireEvent.click(screen.getByRole('button', { name: 'SAVE', exact: true })); await screen.findByText('Saved #8'); expect(mocks.rpc).toHaveBeenCalledWith('dev_note_add', expect.objectContaining({ p_note: '', p_shot: 'data:image/jpeg;base64,shot' }));
    fireEvent.click(await screen.findByLabelText('Edit note 7')); fireEvent.change(screen.getByLabelText('Edit note'), { target: { value: 'updated' } }); fireEvent.click(screen.getByText('SAVE EDIT'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('dev_note_edit', { p_id: 7, p_note: 'updated' }));
    await waitFor(() => expect(screen.queryByLabelText('Edit note')).toBeNull()); fireEvent.click(screen.getByLabelText('Drop note 7')); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('dev_note_drop', { p_id: 7 }));
  });
});