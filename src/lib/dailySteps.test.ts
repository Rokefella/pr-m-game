import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('daily steps session coordination', () => {
  beforeEach(() => vi.resetModules());

  it('claims only once across concurrent loads and later Village visits', async () => {
    const { claimDailyStepsOnce } = await import('./dailySteps');
    const claim = vi.fn().mockResolvedValue(250);
    expect(await Promise.all([
      claimDailyStepsOnce('player', claim), claimDailyStepsOnce('player', claim),
    ])).toEqual([250, 250]);
    expect(await claimDailyStepsOnce('player', claim)).toBe(250);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('holds Maze initialization until an in-flight Village claim completes', async () => {
    const { claimDailyStepsOnce, waitForDailySteps } = await import('./dailySteps');
    let resolveClaim: (n: number) => void = () => {};
    const pending = new Promise<number>((resolve) => { resolveClaim = resolve; });
    const order: string[] = [];
    void claimDailyStepsOnce('player', () => pending);
    const mazeLoad = waitForDailySteps('player').then(() => { order.push('fresh row load'); });
    await Promise.resolve();
    expect(order).toEqual([]);
    order.push('grant persisted');
    resolveClaim(250);
    await mazeLoad;
    expect(order).toEqual(['grant persisted', 'fresh row load']);
  });

  it('does not announce an already-claimed day (0)', async () => {
    const { takeDailyStepsAnnouncement } = await import('./dailySteps');
    expect(takeDailyStepsAnnouncement('player', 0)).toBe(false);
  });

  it('announces positive grants once per user session', async () => {
    const { takeDailyStepsAnnouncement } = await import('./dailySteps');
    expect(takeDailyStepsAnnouncement('player', 250)).toBe(true);
    expect(takeDailyStepsAnnouncement('player', 250)).toBe(false);
    expect(takeDailyStepsAnnouncement('other', 250)).toBe(true);
  });
});