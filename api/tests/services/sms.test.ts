import { describe, it, expect, vi } from 'vitest';
import { sendSmsMessages } from '../../src/services/sms';

vi.mock('../../src/config', () => ({
  config: {
    sms: {
      apiKey: '',
      senderId: '',
      apiUrl: '',
    },
  },
}));

vi.mock('../../src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '../../src/db';

describe('sms service', () => {
  it('sendSmsMessages marks delivery as failed when provider is not configured', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'log-1', status: 'queued' }]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'log-1', status: 'failed' }]),
        }),
      }),
    } as any);

    const logs = await sendSmsMessages([
      { recipientType: 'guardian', phoneNumber: '+254711111111', message: 'Hello' },
    ]);

    expect(logs[0]?.status).toBe('failed');
  });
});
