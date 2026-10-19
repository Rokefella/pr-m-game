import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: { BETA_MODE: true },
  from: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/config', () => mocks.config);
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }));

import { canAccessMaze, checkSubscriptionStatus } from './subscriptionStatus';

describe('reversible beta subscription access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.BETA_MODE = true;
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ single: mocks.single }) }),
      update: mocks.update,
    });
    mocks.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  });

  it('treats every user as active in beta without reading or changing their subscription', async () => {
    mocks.single.mockResolvedValue({ data: { subscription_status: 'expired' }, error: null });
    expect(await checkSubscriptionStatus('expired-user')).toBe('active');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('allows maze access for expired subscriptions in beta', () => {
    expect(canAccessMaze('expired')).toBe(true);
  });

  it('restores expired-user restrictions when beta is disabled', async () => {
    mocks.config.BETA_MODE = false;
    mocks.single.mockResolvedValue({ data: { subscription_status: 'expired' }, error: null });
    expect(await checkSubscriptionStatus('expired-user')).toBe('expired');
    expect(canAccessMaze('expired')).toBe(false);
  });

  it('restores trial expiration and the original stored-status update when beta is disabled', async () => {
    mocks.config.BETA_MODE = false;
    mocks.single.mockResolvedValue({
      data: { subscription_status: 'trial', trial_end: '2000-01-01T00:00:00Z' }, error: null,
    });
    expect(await checkSubscriptionStatus('trial-user')).toBe('expired');
    expect(mocks.update).toHaveBeenCalledWith({ subscription_status: 'expired' });
  });

  it.each(['trial', 'active', 'lifetime', 'dev', 'beta'] as const)(
    'preserves access for %s when beta is disabled', (status) => {
      mocks.config.BETA_MODE = false;
      expect(canAccessMaze(status)).toBe(true);
    },
  );
});