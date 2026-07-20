import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  postJournalEntry,
  trialBalance,
  autoPostFeePayment,
  autoPostPayroll,
} from '../../src/services/ledger';

vi.mock('../../src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    execute: vi.fn(),
  },
}));

import { db } from '../../src/db';

describe('ledger service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('postJournalEntry throws when lines are empty', async () => {
    await expect(
      postJournalEntry({
        entryDate: new Date(),
        sourceType: 'manual',
        lines: [],
      }),
    ).rejects.toThrow('Journal entry requires at least one line');
  });

  it('postJournalEntry throws when entry is unbalanced', async () => {
    await expect(
      postJournalEntry({
        entryDate: new Date(),
        sourceType: 'manual',
        lines: [{ accountId: 'acc-1', debit: 100 }],
      }),
    ).rejects.toThrow('Journal entry must be balanced');
  });

  it('autoPostFeePayment throws when ledger accounts are missing', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    await expect(
      autoPostFeePayment({ amount: 100, method: 'cash', invoiceId: 'inv-1' }),
    ).rejects.toThrow('Required ledger accounts are missing');
  });
});
