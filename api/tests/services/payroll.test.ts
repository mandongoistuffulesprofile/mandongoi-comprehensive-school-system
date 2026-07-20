import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAdjustment } from '../../src/services/payroll';

vi.mock('../../src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe('payroll service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('applyAdjustment throws when reason is missing', async () => {
    await expect(
      applyAdjustment({ entryId: 'entry-1', reason: '', amount: 100 }),
    ).rejects.toThrow('Adjustment requires a reason and amount');
  });
});
