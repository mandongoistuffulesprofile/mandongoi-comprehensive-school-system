import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config', () => ({
  config: {
    mpesa: {
      environment: 'sandbox',
      consumerKey: '',
      consumerSecret: '',
      passkey: '',
      shortcode: '174379',
      callbackUrl: 'https://example.com/callback',
    },
  },
}));

describe('mpesa service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('initiateStkPush throws when mpesa credentials are missing', async () => {
    const { initiateStkPush } = await import('../../src/services/mpesa');
    await expect(
      initiateStkPush({
        phoneNumber: '254711111111',
        amount: 100,
        accountReference: 'ADM001',
      }),
    ).rejects.toThrow('M-Pesa Daraja credentials are not configured');
  });
});
