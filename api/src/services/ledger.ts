import { db, type DbClient } from '../db';
import { ledgerAccounts, ledgerEntries, ledgerLines, receipts } from '../models/schema';
import { eq, sql } from 'drizzle-orm';
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
    .where(sql`${ledgerAccounts.id} = ANY(ARRAY[${sql.join(accountIds.map((id) => sql`${id}`), sql`, `)}])`);
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
