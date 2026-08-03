import { db, type DbClient } from '../db';
import {
  payrollRuns,
  staff,
  attendanceStaff,
  extraDutyPayments,
  schoolSettings,
  payrollEntries,
  payrollAdjustments,
} from '../models/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { autoPostPayroll } from './ledger';
import { logger } from '../utils/logger';

export async function generateRunEntries({ runId }: { runId: string }) {
  const [run] = await db
    .select()
    .from(payrollRuns)
    .where(eq(payrollRuns.id, runId))
    .limit(1);
  if (!run) throw new AppError('Payroll run not found', 404);
  if (run.status !== 'draft') {
    throw new AppError('Entries can only be generated for a draft run', 400);
  }

  const activeStaff = await db.select().from(staff).where(and(eq(staff.isActive, true), eq(staff.teacherType, 'bom')));

  return db.transaction(async (tx) => {
    const entries = [];

    for (const member of activeStaff) {
      let gross = Number(member.baseRate);
      let sessionsCounted: number | null = null;
      let daysPresent: number | null = null;

      if (member.employmentType === 'sessionBased') {
        const [row] = await tx
          .select({ sum: sql`COALESCE(SUM(${attendanceStaff.sessionsTaught}), 0)` })
          .from(attendanceStaff)
          .where(
            and(
              eq(attendanceStaff.staffId, member.id),
              sql`EXTRACT(MONTH FROM ${attendanceStaff.date}) = ${run.month}`,
              sql`EXTRACT(YEAR FROM ${attendanceStaff.date}) = ${run.year}`,
            ),
          );
        sessionsCounted = Number(row?.sum ?? 0);
        gross = Number(member.baseRate) * sessionsCounted;
      } else {
        const [row] = await tx
          .select({ count: sql`COUNT(*)` })
          .from(attendanceStaff)
          .where(
            and(
              eq(attendanceStaff.staffId, member.id),
              eq(attendanceStaff.status, 'present'),
              sql`EXTRACT(MONTH FROM ${attendanceStaff.date}) = ${run.month}`,
              sql`EXTRACT(YEAR FROM ${attendanceStaff.date}) = ${run.year}`,
            ),
          );
        daysPresent = Number(row?.count ?? 0);
      }

      const [entry] = await tx
        .insert(payrollEntries)
        .values({
          payrollRunId: runId,
          staffId: member.id,
          baseRate: member.baseRate,
          sessionsCounted,
          daysPresent,
          grossPay: String(gross),
          netPay: String(gross),
        })
        .returning();

      entries.push(entry);
    }

    return entries;
  });
}

export async function applyAdjustment({
  entryId,
  reason,
  amount,
}: {
  entryId: string;
  reason: string;
  amount: number;
}) {
  if (!reason || amount === undefined || amount === null) {
    throw new AppError('Adjustment requires a reason and amount', 400);
  }

  return db.transaction(async (tx) => {
    const [adj] = await tx
      .insert(payrollAdjustments)
      .values({ payrollEntryId: entryId, reason, amount: String(amount) })
      .returning();

    const [entry] = await tx
      .select()
      .from(payrollEntries)
      .where(eq(payrollEntries.id, entryId))
      .limit(1);
    if (!entry) return adj;

    const [row] = await tx
      .select({ sum: sql`COALESCE(SUM(${payrollAdjustments.amount}), 0)` })
      .from(payrollAdjustments)
      .where(eq(payrollAdjustments.payrollEntryId, entryId));

    const totalAdjustments = Number(row?.sum ?? 0);
    const net = Number(entry.grossPay) + totalAdjustments;

    await tx
      .update(payrollEntries)
      .set({ netPay: String(net) })
      .where(eq(payrollEntries.id, entryId));

    return adj;
  });
}

export async function calculateExtraDutyPayments(month: number, year: number) {
  const [settings] = await db.select().from(schoolSettings).limit(1);
  const defaultRates = {
    morning: Number(settings?.morningSessionRate || 200),
    evening: Number(settings?.eveningSessionRate || 300),
    weekend: Number(settings?.weekendSessionRate || 500),
  };

  const dutyData = await db
    .select({
      staffId: extraDutyPayments.staffId,
      sessionType: extraDutyPayments.sessionType,
      sessions: sql`COUNT(*)`,
      rate: sql`MAX(${extraDutyPayments.rate})`,
    })
    .from(extraDutyPayments)
    .where(and(
      sql`EXTRACT(MONTH FROM ${extraDutyPayments.date}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${extraDutyPayments.date}) = ${year}`,
    ))
    .groupBy(extraDutyPayments.staffId, extraDutyPayments.sessionType);

  const allStaff = await db.select().from(staff).where(eq(staff.isActive, true));
  const staffMap = new Map(allStaff.map((s) => [s.id, s]));

  const results = [] as { staffId: string; staffName: string; sessionType: string | null; sessions: number; rate: number; amount: number }[];

  for (const d of dutyData) {
    if (!d.staffId) continue;
    const member = staffMap.get(d.staffId);
    if (!member) continue;
    const st = d.sessionType || "morning";
    const rate = Number(member.extraSessionRate) || defaultRates[st as keyof typeof defaultRates] || 0;
    const count = Number(d.sessions);
    results.push({
      staffId: d.staffId,
      staffName: member.name,
      sessionType: st,
      sessions: count,
      rate,
      amount: count * rate,
    });
  }

  return results;
}

export async function postPayrollRunToLedger({
  runId,
  createdBy,
}: {
  runId: string;
  createdBy?: string;
}, tx?: DbClient) {
  const client = tx ?? db;
  const entries = await client
    .select()
    .from(payrollEntries)
    .where(eq(payrollEntries.payrollRunId, runId));

  for (const entry of entries) {
    try {
      await autoPostPayroll({
        amount: Number(entry.netPay),
        staffId: entry.staffId,
        payrollRunId: runId,
        createdBy,
      }, client);
    } catch (err) {
      logger.error(`Ledger auto-post for payroll entry ${entry.id} failed`, { error: err });
      throw err;
    }
  }

  return { posted: entries.length };
}
