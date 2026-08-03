import { db, type DbClient } from '../db';
import { ledgerAccounts, ledgerEntries, ledgerLines, receipts, users } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { writeToDlq } from './deadLetterQueue';

export type JournalLine = {
  accountId: string;
  debit?: number;
  credit?: number;
};

export type PostJournalInput = {
  entryDate: Date | string;
  description?: string;
  sourceType: 'feePayment' | 'payroll' | 'expense' | 'smsCost' | 'manual' | 'foodPurchase' | 'foodContribution';
  sourceId?: string;
  createdBy?: string;
  lines: JournalLine[];
};

export async function getAccountByCode(code: string) {
  const [account] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.code, code))
    .limit(1);
  return account;
}

export async function postJournalEntry(input: PostJournalInput, tx?: DbClient) {
  const client = tx ?? db;
  const totalDebit = input.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + (l.credit || 0), 0);

  if (input.lines.length === 0) {
    throw new AppError('Journal entry requires at least one line', 400);
  }
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AppError('Journal entry must be balanced (total debits must equal total credits)', 400);
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId).filter(Boolean))];
  const existing = await client
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(sql`${ledgerAccounts.id} = ANY(ARRAY[${sql.join(accountIds.map((id) => sql`${id}::uuid`), sql`, `)}])`);
  const existingSet = new Set(existing.map((a) => a.id));
  for (const id of accountIds) {
    if (!existingSet.has(id)) {
      throw new AppError(`Ledger account ${id} does not exist`, 400);
    }
  }

  const [entry] = await client
    .insert(ledgerEntries)
    .values({
      entryDate: typeof input.entryDate === 'string' ? new Date(input.entryDate) : input.entryDate,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId || null,
      createdBy: input.createdBy || null,
    })
    .returning();

  await client.insert(ledgerLines).values(
    input.lines.map((l) => ({
      ledgerEntryId: entry.id,
      accountId: l.accountId,
      debit: String(l.debit || 0),
      credit: String(l.credit || 0),
    })),
  );

  return entry;
}

export type JournalListFilter = {
  page?: number;
  limit?: number;
  search?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
};

export async function listJournalEntries(filter: JournalListFilter = {}) {
  const { page = 1, limit = 10, search = "", sourceType, dateFrom, dateTo, minAmount } = filter;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  if (search) {
    conditions.push(sql`${ledgerEntries.description} ILIKE ${`%${search}%`}`);
  }
  if (sourceType) {
    conditions.push(eq(ledgerEntries.sourceType, sourceType as any));
  }
  if (dateFrom) {
    conditions.push(sql`${ledgerEntries.entryDate} >= ${dateFrom}::date`);
  }
  if (dateTo) {
    conditions.push(sql`${ledgerEntries.entryDate} <= ${dateTo}::date`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ledgerEntries)
    .where(whereClause);

  const rows = await db
    .select({
      id: ledgerEntries.id,
      entryDate: ledgerEntries.entryDate,
      description: ledgerEntries.description,
      sourceType: ledgerEntries.sourceType,
      createdAt: ledgerEntries.createdAt,
      createdByName: users.name,
      sourceId: ledgerEntries.sourceId,
    })
    .from(ledgerEntries)
    .leftJoin(users, eq(ledgerEntries.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit)
    .offset(offset);

  const total = Number(count) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: rows,
    pagination: { page, limit, total, totalPages },
  };
}

export async function getJournalEntryById(id: string) {
  const [entry] = await db
    .select({
      id: ledgerEntries.id,
      entryDate: ledgerEntries.entryDate,
      description: ledgerEntries.description,
      sourceType: ledgerEntries.sourceType,
      sourceId: ledgerEntries.sourceId,
      createdAt: ledgerEntries.createdAt,
      createdByName: users.name,
    })
    .from(ledgerEntries)
    .leftJoin(users, eq(ledgerEntries.createdBy, users.id))
    .where(eq(ledgerEntries.id, id))
    .limit(1);

  if (!entry) return null;

  const lines = await db
    .select({
      accountId: ledgerLines.accountId,
      accountName: ledgerAccounts.name,
      accountCode: ledgerAccounts.code,
      accountType: ledgerAccounts.type,
      debit: ledgerLines.debit,
      credit: ledgerLines.credit,
    })
    .from(ledgerLines)
    .leftJoin(ledgerAccounts, eq(ledgerLines.accountId, ledgerAccounts.id))
    .where(eq(ledgerLines.ledgerEntryId, id))
    .orderBy(ledgerLines.id);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  return { ...entry, lines, totalDebit, totalCredit };
}

export async function updateJournalEntry(id: string, input: { entryDate: Date | string; description?: string; lines: JournalLine[] }) {
  const totalDebit = input.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AppError('Journal entry must be balanced (total debits must equal total credits)', 400);
  }

  const [entry] = await db
    .update(ledgerEntries)
    .set({
      entryDate: typeof input.entryDate === 'string' ? new Date(input.entryDate) : input.entryDate,
      description: input.description,
    })
    .where(eq(ledgerEntries.id, id))
    .returning();
  if (!entry) throw new AppError('Journal entry not found', 404);

  await db.delete(ledgerLines).where(eq(ledgerLines.ledgerEntryId, id));
  await db.insert(ledgerLines).values(
    input.lines.map((l) => ({
      ledgerEntryId: id,
      accountId: l.accountId,
      debit: String(l.debit || 0),
      credit: String(l.credit || 0),
    })),
  );

  return entry;
}

export async function trialBalance() {
  const result = await db.execute(sql`
    SELECT a.id AS "accountId", a.code, a.name, a.type,
           COALESCE(SUM(l.debit), 0) AS debit,
           COALESCE(SUM(l.credit), 0) AS credit
    FROM ${ledgerAccounts} a
    LEFT JOIN ${ledgerLines} l ON l.account_id = a.id
    GROUP BY a.id, a.code, a.name, a.type
    ORDER BY a.code
  `);
  return result.rows;
}

export async function autoPostFeePayment({
  amount,
  method,
  invoiceId,
  createdBy,
}: {
  amount: number;
  method: string;
  invoiceId: string;
  createdBy?: string;
}, tx?: DbClient) {
  try {
    const assetCode = method === 'mpesa' ? '4000' : '1000';
    const [asset] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.code, assetCode))
      .limit(1);
    const [income] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.code, '2000'))
      .limit(1);

    if (!asset || !income) {
      throw new AppError('Required ledger accounts are missing (run the seed script)', 500);
    }

    return await postJournalEntry({
      entryDate: new Date(),
      description: `Fee payment received - invoice ${invoiceId}`,
      sourceType: 'feePayment',
      sourceId: invoiceId,
      createdBy,
      lines: [
        { accountId: asset.id, debit: amount },
        { accountId: income.id, credit: amount },
      ],
    }, tx);
  } catch (err) {
    await writeToDlq({
      sourceType: 'ledger-autoPostFeePayment',
      sourceId: invoiceId,
      payload: { amount, method, invoiceId, createdBy },
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}

export async function autoPostPayroll({
  amount,
  staffId,
  payrollRunId,
  createdBy,
}: {
  amount: number;
  staffId: string;
  payrollRunId: string;
  createdBy?: string;
}, tx?: DbClient) {
  const [expense] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.code, '3000'))
    .limit(1);
  const [cash] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.code, '1000'))
    .limit(1);

  if (!expense || !cash) {
    throw new AppError('Required ledger accounts are missing (run the seed script)', 500);
  }

  return postJournalEntry({
    entryDate: new Date(),
    description: `Payroll expense - staff ${staffId}`,
    sourceType: 'payroll',
    sourceId: payrollRunId,
    createdBy,
    lines: [
      { accountId: expense.id, debit: amount },
      { accountId: cash.id, credit: amount },
    ],
  }, tx);
}
