import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), navigate: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('react-router-dom', async importOriginal => ({ ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => auth.navigate }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

function submit(signup = false) {
  render(<MemoryRouter>{signup ? <Signup /> : <Login />}</MemoryRouter>);
  fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'wanderer@example.com' } });
  fireEvent.change(screen.getByLabelText('PASSWORD'), { target: { value: 'test-secret' } });
  if (signup) fireEvent.change(screen.getByLabelText('CONFIRM PASSWORD'), { target: { value: 'test-secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'ENTER' }));
}

describe('auth navigation rules', () => {
  it('does not navigate after signup returns a user without a session; login remains available', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'test' }, session: null }, error: null });
    submit(true);
    const login = await screen.findByRole('button', { name: 'GO TO LOGIN' });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'wanderer@example.com', password: 'test-secret' });
    expect(auth.navigate).not.toHaveBeenCalled();
    fireEvent.click(login);
    expect(auth.navigate).toHaveBeenCalledWith('/login');
  });
  it('keeps the /intro destination for signup with a session', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'test' }, session: { access_token: 'fixture' } }, error: null });
    submit(true);
    await waitFor(() => expect(auth.navigate).toHaveBeenCalledWith('/intro'));
  });
  it('keeps the home destination and credentials for successful login', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    submit();
    await waitFor(() => expect(auth.navigate).toHaveBeenCalledWith('/'));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'wanderer@example.com', password: 'test-secret' });
  });
  it('does not navigate on invalid login credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    submit();
    await screen.findByRole('alert');
    expect(auth.navigate).not.toHaveBeenCalled();
  });
  it('does not navigate when an email is already registered', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'User already registered' } });
    submit(true);
    await screen.findByRole('alert');
    expect(auth.navigate).not.toHaveBeenCalled();
  });
  it('does not call signup for mismatched passwords', () => {
    render(<MemoryRouter><Signup /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('PASSWORD'), { target: { value: 'test-secret' } });
    fireEvent.change(screen.getByLabelText('CONFIRM PASSWORD'), { target: { value: 'different' } });
    fireEvent.submit(screen.getByRole('button', { name: 'ENTER' }).closest('form') as HTMLFormElement);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.navigate).not.toHaveBeenCalled();
  });
});