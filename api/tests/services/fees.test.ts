import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInvoice, recordManualPayment } from '../../src/services/fees';

vi.mock('../../src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    execute: vi.fn(),
  },
}));

import { db } from '../../src/db';

describe('fees service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generateInvoice throws when student does not exist', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    await expect(
      generateInvoice({ studentId: 'student-1', feeStructureId: 'fs-1' }),
    ).rejects.toThrow('Student not found');
  });

  it('recordManualPayment throws when amount is not positive', async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [{ nextval: '1' }] } as any);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ studentId: 's-1', term: 1, academicYear: 2026, foodProgramType: 'none' }]),
          }),
        }),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'inv-1', balance: '0', amountPaid: '0', totalAmount: '1000' }]),
        }),
      }),
    } as any);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'r-1' }]),
        onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    } as any);

    await expect(
      recordManualPayment({
        invoiceId: 'inv-1',
        amount: 0,
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow('Payment amount must be greater than zero');
  });
});
