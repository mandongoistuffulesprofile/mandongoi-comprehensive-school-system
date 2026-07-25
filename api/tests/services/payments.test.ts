import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../src/services/ledger', () => ({
  autoPostFeePayment: vi.fn().mockResolvedValue({ id: 'ledger-entry-1' }),
}));

vi.mock('../../src/services/notify', () => ({
  notify: vi.fn(),
}));

import { db } from '../../src/db';

function makeDefaultSelectChain() {
  const limit = vi.fn().mockResolvedValue([]);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ limit, orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where, limit, orderBy });
  const from = vi.fn().mockReturnValue({ where, innerJoin, orderBy, limit });
  vi.mocked(db.select).mockReturnValue({ from, where, innerJoin, orderBy, limit } as any);
  return { limit, orderBy, where, innerJoin, from, select: vi.mocked(db.select) };
}

function makeDefaultUpdateChain() {
  const returning = vi.fn().mockResolvedValue([]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as any);
  return { returning, where, set };
}

function makeDefaultInsertChain() {
  const returning = vi.fn().mockResolvedValue([]);
  const onConflict = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing: onConflict, returning });
  vi.mocked(db.insert).mockReturnValue({ values } as any);
  return { returning, onConflict, values };
}

function makeDefaultExecuteChain() {
  vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);
}

describe('applyMpesaWebhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeDefaultSelectChain();
    makeDefaultUpdateChain();
    makeDefaultInsertChain();
    makeDefaultExecuteChain();
  });

  it('rejects zero amount', async () => {
    const { applyMpesaWebhook } = await import('../../src/services/fees');
    await expect(
      applyMpesaWebhook({
        transactionId: 'tx-1',
        amount: 0,
        phoneNumber: '254711111111',
        accountReference: 'INV-123',
        transactionDate: new Date().toISOString(),
      }),
    ).rejects.toThrow('must be greater than zero');
  });

  it('rejects missing transactionId', async () => {
    const { applyMpesaWebhook } = await import('../../src/services/fees');
    await expect(
      applyMpesaWebhook({
        transactionId: '',
        amount: 100,
        phoneNumber: '254711111111',
        accountReference: 'INV-123',
        transactionDate: new Date().toISOString(),
      }),
    ).rejects.toThrow('transactionId is required');
  });

  it('returns duplicate when transaction already exists', async () => {
    const chain = makeDefaultSelectChain();
    chain.from.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'paybill-1', shortcode: '174379', isActive: true }]),
      }),
    });

    const insertChain = makeDefaultInsertChain();
    insertChain.returning.mockResolvedValue([]);

    const { applyMpesaWebhook } = await import('../../src/services/fees');
    const result = await applyMpesaWebhook({
      transactionId: 'existing-tx',
      amount: 100,
      phoneNumber: '254711111111',
      accountReference: 'REF-001',
      transactionDate: new Date().toISOString(),
    });

    expect(result.status).toBe('duplicate');
  });

  it('returns unmatched when no invoice match found', async () => {
    const chain = makeDefaultSelectChain();
    chain.from.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'paybill-1', shortcode: '174379', isActive: true }]),
        orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    });

    const insertChain = makeDefaultInsertChain();
    insertChain.returning.mockResolvedValue([{ id: 'txn-1', amount: '100', phoneNumber: '254711111111' }]);

    vi.mocked(db.transaction).mockImplementation(async (cb: any) =>
      cb({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
    );

    const { applyMpesaWebhook } = await import('../../src/services/fees');
    const result = await applyMpesaWebhook({
      transactionId: 'tx-new-1',
      amount: 100,
      phoneNumber: '254711111111',
      accountReference: 'REF-NO-MATCH',
      transactionDate: new Date().toISOString(),
    });

    expect(result.status).toBe('unmatched');
  });
});

describe('applyPaymentToInvoice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeDefaultSelectChain();
    makeDefaultUpdateChain();
    makeDefaultInsertChain();
    makeDefaultExecuteChain();
  });

  it('rejects zero amount', async () => {
    const { recordManualPayment } = await import('../../src/services/fees');
    await expect(
      recordManualPayment({ invoiceId: 'inv-1', amount: 0, paymentMethod: 'cash' }),
    ).rejects.toThrow('Payment amount must be greater than zero');
  });

  it('rejects negative amount', async () => {
    const { recordManualPayment } = await import('../../src/services/fees');
    await expect(
      recordManualPayment({ invoiceId: 'inv-1', amount: -100, paymentMethod: 'cash' }),
    ).rejects.toThrow('Payment amount must be greater than zero');
  });

  it('throws when invoice not found', async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [{ nextval: '1' }] } as any);

    const chain = makeDefaultSelectChain();
    chain.innerJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ studentId: 's-1', term: 1, academicYear: 2026, foodProgramType: 'none' }]),
      }),
    });

    const { returning } = makeDefaultUpdateChain();
    returning.mockResolvedValue([]);

    const { recordManualPayment } = await import('../../src/services/fees');
    await expect(
      recordManualPayment({ invoiceId: 'nonexistent', amount: 100, paymentMethod: 'cash' }),
    ).rejects.toThrow('Invoice not found');
  });
});

describe('generateInvoice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeDefaultSelectChain();
    makeDefaultUpdateChain();
    makeDefaultInsertChain();
    makeDefaultExecuteChain();
  });

  it('rejects nonexistent student', async () => {
    const { generateInvoice } = await import('../../src/services/fees');
    await expect(
      generateInvoice({ studentId: 'nonexistent', feeStructureId: 'fs-1' }),
    ).rejects.toThrow('Student not found');
  });

  it('rejects draft fee structure', async () => {
    const chain = makeDefaultSelectChain();
    chain.from
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'student-1', studentType: 'day', foodProgramType: 'none' }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'fs-1', status: 'draft', totalAmount: '1000', term: 1, academicYear: 2026 }]),
        }),
      });

    const { generateInvoice } = await import('../../src/services/fees');
    await expect(
      generateInvoice({ studentId: 'student-1', feeStructureId: 'fs-1' }),
    ).rejects.toThrow('draft');
  });

  it('creates invoice for valid input', async () => {
    const chain = makeDefaultSelectChain();
    chain.from
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'student-1', studentType: 'day', foodProgramType: 'none' }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'fs-1', status: 'active', totalAmount: '5000', term: 1, academicYear: 2026, foodAmount: '1000' }]),
        }),
      });

    const insertChain = makeDefaultInsertChain();
    insertChain.returning.mockResolvedValue([{
      id: 'inv-1', studentId: 'student-1', totalAmount: '5000', balance: '5000', term: 1, academicYear: 2026,
    }]);

    const { generateInvoice } = await import('../../src/services/fees');
    const result = await generateInvoice({ studentId: 'student-1', feeStructureId: 'fs-1' });
    expect(result).toBeDefined();
    expect(result.studentId).toBe('student-1');
  });
});
