import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyMpesaWebhook } from '../../src/services/fees';

const mockSelectBuilder = () => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
});

const buildMocks = () => {
  let selectCallCount = 0;

  const select = vi.fn(() => {
    selectCallCount++;
    const builder = mockSelectBuilder();
    builder.limit.mockImplementation(() => {
      if (selectCallCount === 1) {
        return Promise.resolve([{ id: 'pb-1', shortcode: '174379', isActive: true }]);
      }
      return Promise.resolve([]);
    });
    return builder;
  });

  const insert = vi.fn(() => {
    const returning = vi.fn();
    let returningCallCount = 0;
    returning.mockImplementation(() => {
      returningCallCount++;
      if (returningCallCount === 1) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    return {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      returning,
    };
  });

  return { select, insert, selectCallCount };
};

vi.mock('../../src/db', () => {
  const mocks = buildMocks();
  return {
    db: {
      select: mocks.select,
      insert: mocks.insert,
      update: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })),
    },
    __mocks: mocks,
  };
});

describe('M-Pesa webhook idempotency integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock('../../src/db', async () => {
      const mocks = buildMocks();
      return {
        db: {
          select: mocks.select,
          insert: mocks.insert,
          update: vi.fn(() => ({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([]),
          })),
        },
        __mocks: mocks,
      };
    });
  });

  it('returns duplicate when transaction already exists', async () => {
    const { applyMpesaWebhook } = await import('../../src/services/fees');

    const result = await applyMpesaWebhook({
      transactionId: 'TXN-EXISTING',
      amount: 1000,
      phoneNumber: '+254711111111',
      accountReference: 'ADM001',
      transactionDate: new Date().toISOString(),
      paybillShortcode: '174379',
    });

    expect(result).toEqual({ status: 'duplicate', transaction: null });
  });
});
