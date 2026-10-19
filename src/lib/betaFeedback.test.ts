import { describe, expect, it, vi } from 'vitest';
import { sendBetaFeedback } from './betaFeedback';

describe('beta feedback', () => {
  it('rejects empty and whitespace-only messages without inserting', async () => {
    const insert = vi.fn();
    await expect(sendBetaFeedback('', '/village', 'phone', insert)).rejects.toThrow();
    await expect(sendBetaFeedback(' \n\t ', '/maze', 'phone', insert)).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts one trimmed message with current route and user agent, leaving user_id to the database', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await sendBetaFeedback('  The door is stuck.\nPlease check.  ', '/maze', 'test-phone', insert);
    expect(insert).toHaveBeenCalledExactlyOnceWith({
      message: 'The door is stuck.\nPlease check.', route: '/maze', user_agent: 'test-phone',
    });
  });

  it('does not report success after an insertion failure', async () => {
    await expect(sendBetaFeedback('Test', '/village', 'phone', async () => ({ error: { message: 'Unavailable' } })))
      .rejects.toThrow('Unavailable');
  });
});