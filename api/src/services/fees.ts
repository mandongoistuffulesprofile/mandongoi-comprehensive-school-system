import { db, type DbClient } from '../db';
import {
  feeInvoices,
  feeStructures,
  students,
  guardians,
  mpesaTransactions,
  paybills,
  receipts,
  foodLogs,
} from '../models/schema';
import { eq, and, desc, ne, sql, like } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { autoPostFeePayment } from './ledger';
import { notify } from './notify';

function assertFinite(value: any, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new AppError(`${label} must be a valid number, got ${JSON.stringify(value)}`, 400);
  }
  return n;
}

function assertPositive(value: number, label: string): void {
  if (value <= 0) {
    throw new AppError(`${label} must be greater than zero, got ${value}`, 400);
  }
}

const BATCH_SIZE = 50;

export type GenerateInvoiceInput = {
  studentId: string;
  feeStructureId: string;
  dueDate?: string;
};

export async function generateInvoice(input: GenerateInvoiceInput) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, input.studentId))
    .limit(1);
  if (!student) throw new AppError('Student not found', 404);

  const [structure] = await db
    .select()
    .from(feeStructures)
    .where(eq(feeStructures.id, input.feeStructureId))
    .limit(1);
  if (!structure) throw new AppError('Fee structure not found', 404);
  if (structure.status !== 'active') {
    throw new AppError('Cannot generate invoice from a draft fee structure. Publish it first.', 400);
  }

  let total = assertFinite(structure.totalAmount, 'Fee structure totalAmount');
  if (student.studentType === 'boarding' && student.foodProgramType === 'bring_own') {
    const foodAmount = assertFinite(structure.foodAmount, 'Fee structure foodAmount');
    total -= foodAmount;
  }
  assertPositive(total, 'Invoice total');

  const [invoice] = await db
    .insert(feeInvoices)
    .values({
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      term: structure.term,
      academicYear: structure.academicYear,
      totalAmount: String(total),
      amountPaid: '0',
      balance: String(total),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    })
    .returning();

  return invoice;
}

export async function generateBulkInvoices(feeStructureId: string) {
  const [structure] = await db
    .select()
    .from(feeStructures)
    .where(eq(feeStructures.id, feeStructureId))
    .limit(1);
  if (!structure) throw new AppError('Fee structure not found', 404);
  if (structure.status !== 'active') {
    throw new AppError('Cannot generate invoices from a draft fee structure. Publish it first.', 400);
  }

  const studentConditions = [eq(students.grade, structure.grade), eq(students.status, 'active')];
  if (structure.studentType === 'boarding') {
    studentConditions.push(eq(students.studentType, 'boarding'));
  } else if (structure.studentType === 'day') {
    studentConditions.push(eq(students.studentType, 'day'));
  }
  const activeStudents = await db
    .select()
    .from(students)
    .where(and(...studentConditions));

  const existingInvoices = await db
    .select({ studentId: feeInvoices.studentId })
    .from(feeInvoices)
    .where(and(
      eq(feeInvoices.term, structure.term),
      eq(feeInvoices.academicYear, structure.academicYear),
      eq(feeInvoices.feeStructureId, feeStructureId),
    ));

  const existingIds = new Set(existingInvoices.map((i) => i.studentId));
  const toCreate = activeStudents.filter((s) => !existingIds.has(s.id));

  const results = { created: 0, skipped: activeStudents.length - toCreate.length, errors: 0, total: activeStudents.length };

  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (student) => {
      try {
        let total = assertFinite(structure.totalAmount, 'Fee structure totalAmount');
        if (student.studentType === 'boarding' && student.foodProgramType === 'bring_own') {
          total -= assertFinite(structure.foodAmount, 'Fee structure foodAmount');
        }
        assertPositive(total, 'Invoice total');
        await db.insert(feeInvoices).values({
          studentId: student.id,
          feeStructureId,
          term: structure.term,
          academicYear: structure.academicYear,
          totalAmount: String(total),
          amountPaid: '0',
          balance: String(total),
        });
        results.created++;
      } catch (err) {
        results.errors++;
        logger.error('Bulk invoice creation failed for student', { studentId: student.id, error: err });
      }
    }));
  }

  return results;
}

async function nextReceiptNumber(): Promise<number> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS receipt_number_seq`).catch(() => {});
  const rows = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('receipt_number_seq')::text AS nextval`
  );
  const row = Array.isArray(rows) ? rows[0] : (rows as any).rows?.[0];
  return Number(row?.nextval ?? 1);
}

type ApplyPaymentInput = {
  invoiceId: string;
  amount: number;
  paymentMethod: 'mpesa' | 'cash' | 'bank';
  mpesaTransactionId?: string;
  issuedBy?: string;
};

async function applyPaymentToInvoice(input: ApplyPaymentInput, tx?: DbClient) {
  assertFinite(input.amount, 'Payment amount');
  assertPositive(input.amount, 'Payment amount');

  const client = tx ?? db;

  const [updated] = await client
    .update(feeInvoices)
    .set({
      amountPaid: sql`${feeInvoices.amountPaid} + ${input.amount}`,
      balance: sql`GREATEST(0, CAST(${feeInvoices.totalAmount} AS numeric) - (${feeInvoices.amountPaid} + ${input.amount}))`,
      status: sql`CASE WHEN ${feeInvoices.amountPaid} + ${input.amount} >= CAST(${feeInvoices.totalAmount} AS numeric) THEN 'paid'::text WHEN ${feeInvoices.amountPaid} + ${input.amount} > 0 THEN 'partial'::text ELSE 'unpaid'::text END`,
    })
    .where(eq(feeInvoices.id, input.invoiceId))
    .returning();

  if (!updated) throw new AppError("Invoice not found", 404);

  if (Number(updated.balance) < 0 || Number(updated.amountPaid) > Number(updated.totalAmount)) {
    throw new AppError('Invoice balance invariant violated after payment', 500);
  }

  const receiptNumber = await nextReceiptNumber();
  const [receipt] = await client
    .insert(receipts)
    .values({
      invoiceId: input.invoiceId,
      mpesaTransactionId: input.mpesaTransactionId || null,
      receiptNumber: String(receiptNumber),
      amount: String(input.amount),
      paymentMethod: input.paymentMethod,
      issuedBy: input.issuedBy || null,
    })
    .returning();

  const foodInv = await client
    .select({
      studentId: feeInvoices.studentId,
      term: feeInvoices.term,
      academicYear: feeInvoices.academicYear,
      foodProgramType: students.foodProgramType,
    })
    .from(feeInvoices)
    .innerJoin(students, eq(feeInvoices.studentId, students.id))
    .where(eq(feeInvoices.id, input.invoiceId))
    .limit(1)
    .then((rows) => rows[0] || null)
    .catch(() => null);

  if (foodInv && foodInv.foodProgramType === 'pay_fee') {
    await db.insert(foodLogs).values({
      studentId: foodInv.studentId,
      itemName: 'Food Fee Payment',
      type: 'payment',
      quantity: '1',
      unit: 'KES',
      estimatedValue: String(input.amount),
      notes: `Paid via ${input.paymentMethod}`,
      term: foodInv.term,
      academicYear: foodInv.academicYear,
      loggedBy: input.issuedBy,
    }).catch((err) => logger.error('Food payment log failed', { error: err }));
  }

  return { invoice: updated, receipt };
}

export async function recordManualPayment(input: ApplyPaymentInput) {
  const result = await applyPaymentToInvoice(input);
  await autoPostFeePayment({
    amount: input.amount,
    method: input.paymentMethod,
    invoiceId: input.invoiceId,
    createdBy: input.issuedBy,
  }).catch((err) => {
    logger.error('Ledger auto-post for manual payment failed', { error: err, invoiceId: input.invoiceId });
  });
  return result;
}

async function resolvePaybill(opts: { paybillId?: string; paybillShortcode?: string }) {
  if (opts.paybillId) {
    const [p] = await db
      .select()
      .from(paybills)
      .where(eq(paybills.id, opts.paybillId))
      .limit(1);
    if (p) return p;
  }
  if (opts.paybillShortcode) {
    const [p] = await db
      .select()
      .from(paybills)
      .where(eq(paybills.shortcode, opts.paybillShortcode))
      .limit(1);
    if (p) return p;
  }
  const [p] = await db
    .select()
    .from(paybills)
    .where(eq(paybills.isActive, true))
    .limit(1);
  return p || null;
}

async function matchInvoice(accountReference: string, phoneNumber?: string) {
  const ref = (accountReference || '').trim();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(ref)) {
    const [invByRef] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, ref)).limit(1);
    if (invByRef) return invByRef;
  }

  const invMatch = ref.match(/INV([a-f0-9]{6,})$/i);
  if (invMatch) {
    const prefix = invMatch[1].toLowerCase();
    const [matched] = await db
      .select()
      .from(feeInvoices)
      .where(sql`LOWER(${feeInvoices.id}) LIKE ${prefix + '%'}`)
      .limit(1);
    if (matched) return matched;
  }

  const nameGradeMatch = ref.match(/^([A-Za-z]+)\.([A-Za-z]+)-(Grade\s?\d+)$/i) || ref.match(/^([A-Za-z]+)\s+([A-Za-z]+)-(Grade\s?\d+)$/i) || ref.match(/^([A-Z][a-z]+)([A-Z][a-z]+)-(Grade\s?\d+)$/);
  const nameOnlyMatch = !nameGradeMatch ? ref.match(/^([A-Za-z]+)\.([A-Za-z]+)$/i) || ref.match(/^([A-Za-z]+)([A-Z][a-z]+)$/) : null;
  const nameMatch = nameGradeMatch || nameOnlyMatch;

  if (nameMatch) {
    const firstName = nameMatch[1];
    const lastName = nameMatch[2];
    const grade = nameGradeMatch ? nameGradeMatch[3] : null;
    const conditions = [
      eq(sql`LOWER(${students.firstName})`, firstName.toLowerCase()),
      eq(sql`LOWER(${students.lastName})`, lastName.toLowerCase()),
    ];
    if (grade) conditions.push(eq(students.grade, grade));
    const [studentByName] = await db.select().from(students).where(and(...conditions)).limit(1);
    if (studentByName) {
      const [inv] = await db.select().from(feeInvoices)
        .where(and(eq(feeInvoices.studentId, studentByName.id), ne(feeInvoices.status, 'paid')))
        .orderBy(desc(feeInvoices.createdAt))
        .limit(1);
      return inv || null;
    }
  }

  const byPhone = await matchInvoiceByPhone(phoneNumber || '');
  if (byPhone) return byPhone;

  return null;
}

async function matchInvoiceByPhone(phoneNumber: string) {
  if (!phoneNumber) return null;
  const normalized = phoneNumber.replace(/[^0-9]/g, '');
  if (normalized.length < 9) return null;

  const suffix = normalized.length >= 9 ? normalized.slice(-9) : normalized;
  const guardiansByPhone = await db
    .select({ studentId: guardians.studentId })
    .from(guardians)
    .where(sql`RIGHT(REGEXP_REPLACE(${guardians.phone}, '[^0-9]', '', 'g'), 9) = ${suffix}`)
    .limit(1);

  if (guardiansByPhone.length === 0) return null;

  const [inv] = await db
    .select()
    .from(feeInvoices)
    .where(and(
      eq(feeInvoices.studentId, guardiansByPhone[0].studentId),
      ne(feeInvoices.status, 'paid'),
    ))
    .orderBy(desc(feeInvoices.createdAt))
    .limit(1);

  return inv || null;
}

export async function manualMatchTransaction(transactionId: string, invoiceId: string) {
  const [txn] = await db.select().from(mpesaTransactions).where(eq(mpesaTransactions.id, transactionId)).limit(1);
  if (!txn) throw new AppError("Transaction not found", 404);
  const [invoice] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw new AppError("Invoice not found", 404);
  const amount = assertFinite(txn.amount, 'Transaction amount');
  assertPositive(amount, 'Transaction amount');
  await applyPaymentToInvoice({
    invoiceId: invoice.id,
    amount,
    paymentMethod: "mpesa",
    mpesaTransactionId: txn.id,
  });
  await autoPostFeePayment({
    amount,
    method: 'mpesa',
    invoiceId: invoice.id,
    createdBy: undefined,
  }).catch((err) => {
    logger.error('Ledger auto-post for manual match failed', { error: err, transactionId, invoiceId });
  });
  const [updated] = await db.update(mpesaTransactions)
    .set({ matchedStudentId: invoice.studentId, matchedInvoiceId: invoice.id, matchStatus: "manually-matched" })
    .where(eq(mpesaTransactions.id, txn.id))
    .returning();
  return updated;
}

export async function listUnmatchedTransactions() {
  return db.select({
    id: mpesaTransactions.id,
    transactionId: mpesaTransactions.transactionId,
    amount: mpesaTransactions.amount,
    phoneNumber: mpesaTransactions.phoneNumber,
    accountReference: mpesaTransactions.accountReference,
    transactionDate: mpesaTransactions.transactionDate,
    matchStatus: mpesaTransactions.matchStatus,
    createdAt: mpesaTransactions.createdAt,
  }).from(mpesaTransactions)
    .where(eq(mpesaTransactions.matchStatus, "unmatched"))
    .orderBy(desc(mpesaTransactions.createdAt));
}

export async function listAllPayments() {
  const mpesa = await db.select({
    id: mpesaTransactions.id,
    type: sql`'mpesa'`,
    transactionId: mpesaTransactions.transactionId,
    amount: mpesaTransactions.amount,
    phoneNumber: mpesaTransactions.phoneNumber,
    accountReference: mpesaTransactions.accountReference,
    matchStatus: mpesaTransactions.matchStatus,
    transactionDate: mpesaTransactions.transactionDate,
    createdAt: mpesaTransactions.createdAt,
  }).from(mpesaTransactions)
    .orderBy(desc(mpesaTransactions.createdAt))
    .limit(200);

  const manualReceipts = await db.select({
    id: receipts.id,
    type: sql`'manual'`,
    transactionId: sql`''`,
    amount: receipts.amount,
    phoneNumber: sql`''`,
    accountReference: sql`''`,
    matchStatus: sql`'manual'`,
    transactionDate: receipts.issuedAt,
    createdAt: receipts.issuedAt,
  }).from(receipts)
    .orderBy(desc(receipts.issuedAt))
    .limit(200);

  const all: Array<Record<string, any>> = [...mpesa, ...manualReceipts];
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return all.slice(0, 200);
}

export type MpesaWebhookInput = {
  transactionId: string;
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDate: string;
  rawPayload?: unknown;
  paybillId?: string;
  paybillShortcode?: string;
};

export async function applyMpesaWebhook(input: MpesaWebhookInput) {
  assertFinite(input.amount, 'M-Pesa amount');
  assertPositive(input.amount, 'M-Pesa amount');
  if (!input.transactionId || typeof input.transactionId !== 'string') {
    throw new AppError('M-Pesa transactionId is required', 400);
  }
  const ref = (input.accountReference || '').trim();

  const paybill = await resolvePaybill({
    paybillId: input.paybillId,
    paybillShortcode: input.paybillShortcode,
  });
  if (!paybill) {
    throw new AppError('No paybill configured for this M-Pesa transaction', 400);
  }

  const inserted = await db
    .insert(mpesaTransactions)
    .values({
      paybillId: paybill.id,
      transactionId: input.transactionId,
      amount: String(input.amount),
      phoneNumber: input.phoneNumber,
      accountReference: ref,
      transactionDate: new Date(input.transactionDate),
      rawPayload: (input.rawPayload as object) ?? input,
    })
    .onConflictDoNothing({ target: mpesaTransactions.transactionId })
    .returning();

  if (inserted.length === 0) {
    return { status: 'duplicate', transaction: null };
  }

  const txn = inserted[0];
  const invoice = await matchInvoice(ref, input.phoneNumber);

  return db.transaction(async (tx) => {
    if (!invoice) {
      await tx
        .update(mpesaTransactions)
        .set({ matchStatus: 'unmatched' })
        .where(eq(mpesaTransactions.id, txn.id));

      notify({
        title: 'Unmatched M-Pesa Payment',
        message: `KES ${Number(txn.amount).toLocaleString()} received from ${txn.phoneNumber} (ref: ${ref}) but no matching invoice found.`,
        type: 'warning',
        link: '/fees/reconciliation',
      });

      return { status: 'unmatched', transaction: txn };
    }

    const [student] = await tx
      .select({ firstName: students.firstName, lastName: students.lastName, grade: students.grade })
      .from(students)
      .where(eq(students.id, invoice.studentId))
      .limit(1);

    await applyPaymentToInvoice({
      invoiceId: invoice.id,
      amount: Number(txn.amount),
      paymentMethod: 'mpesa',
      mpesaTransactionId: txn.id,
    }, tx);

    await autoPostFeePayment({
      amount: Number(txn.amount),
      method: 'mpesa',
      invoiceId: invoice.id,
      createdBy: undefined,
    }, tx);

    await tx
      .update(mpesaTransactions)
      .set({
        matchedStudentId: invoice.studentId,
        matchedInvoiceId: invoice.id,
        matchStatus: 'auto-matched',
      })
      .where(eq(mpesaTransactions.id, txn.id));

    const studentName = student ? `${student.firstName} ${student.lastName}` : `student #${invoice.studentId.slice(0, 8)}`;
    const studentDetail = student ? `${studentName} (${student.grade})` : studentName;
    notify({
      title: 'M-Pesa Payment Received',
      message: `KES ${Number(txn.amount).toLocaleString()} received from ${txn.phoneNumber} for ${studentDetail}.`,
      type: 'success',
      link: `/fees/invoices?studentId=${invoice.studentId}`,
      roles: ['schoolAdmin', 'accountant'],
    });

    return { status: 'processed', transaction: txn };
  });
}

export type ListInvoicesFilter = {
  studentId?: string;
  status?: string;
  term?: number;
  academicYear?: number;
  balanceFilter?: 'pending' | 'paid' | 'overdue';
  page?: number;
  limit?: number;
};

export async function listInvoices(filter: ListInvoicesFilter = {}) {
  const conditions = [];
  if (filter.studentId) conditions.push(eq(feeInvoices.studentId, filter.studentId));
  if (filter.status) conditions.push(eq(feeInvoices.status, filter.status as any));
  if (filter.term) conditions.push(eq(feeInvoices.term, filter.term));
  if (filter.academicYear) conditions.push(eq(feeInvoices.academicYear, filter.academicYear));
  if (filter.balanceFilter === 'pending') conditions.push(sql`${feeInvoices.balance} > 0`);
  if (filter.balanceFilter === 'paid') conditions.push(sql`${feeInvoices.balance} <= 0`);
  if (filter.balanceFilter === 'overdue') {
    conditions.push(sql`${feeInvoices.balance} > 0`);
    conditions.push(sql`${feeInvoices.dueDate} < NOW()`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const page = filter.page ?? 1;
  const limit = Math.min(100, filter.limit ?? 20);

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(feeInvoices)
    .innerJoin(students, eq(feeInvoices.studentId, students.id))
    .where(where);

  const data = await db
    .select({
      id: feeInvoices.id,
      studentId: feeInvoices.studentId,
      feeStructureId: feeInvoices.feeStructureId,
      term: feeInvoices.term,
      academicYear: feeInvoices.academicYear,
      totalAmount: feeInvoices.totalAmount,
      amountPaid: feeInvoices.amountPaid,
      balance: feeInvoices.balance,
      dueDate: feeInvoices.dueDate,
      status: feeInvoices.status,
      lastReminderDate: feeInvoices.lastReminderDate,
      createdAt: feeInvoices.createdAt,
      student: sql`jsonb_build_object('id', ${students.id}, 'firstName', ${students.firstName}, 'lastName', ${students.lastName}, 'grade', ${students.grade})`,
    })
    .from(feeInvoices)
    .innerJoin(students, eq(feeInvoices.studentId, students.id))
    .where(where)
    .orderBy(desc(feeInvoices.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return { data, count: Number(count) };
}

export async function getInvoiceReceipts(invoiceId: string) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.invoiceId, invoiceId))
    .orderBy(desc(receipts.issuedAt));
}
