import { db } from '../db';
import {
  automatedSmsRules,
  smsTemplates,
  guardians,
  students,
  feeInvoices,
  attendanceStudent,
  reportCards,
  schoolSettings,
} from '../models/schema';
import { eq, and, sql, lt, gte } from 'drizzle-orm';
import { sendSmsMessages, type SmsRecipient } from './sms';
import { logger } from '../utils/logger';

const MAX_RULES = 20;
const MAX_RECIPIENTS_PER_RULE = 500;

export async function evaluateAndSend() {
  const rules = await db.select().from(automatedSmsRules).where(eq(automatedSmsRules.isActive, true)).limit(MAX_RULES);
  if (rules.length === 0) return;

  const [settings] = await db.select().from(schoolSettings).limit(1);
  const term = settings?.currentTerm ? Number(settings.currentTerm.replace(/\D/g, '')) || 1 : 1;
  const year = Number(settings?.currentAcademicYear) || new Date().getFullYear();

  for (const rule of rules) {
    try {
      await evaluateRule(rule, term, year, settings);
    } catch (err) {
      logger.error('SMS rule evaluation failed', { ruleId: rule.id, error: err });
    }
  }
}

async function evaluateRule(rule: typeof automatedSmsRules.$inferSelect, term: number, year: number, settings: any) {
  const [template] = rule.templateId
    ? await db.select().from(smsTemplates).where(eq(smsTemplates.id, rule.templateId)).limit(1)
    : [];

  if (!template && rule.templateId) return;

  let recipients: SmsRecipient[] = [];

  switch (rule.triggerType) {
    case 'feeOverdue': {
      const overdue = await db
        .select({
          guardianId: guardians.id,
          phone: guardians.phone,
          name: guardians.name,
          studentId: students.id,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          balance: feeInvoices.balance,
          dueDate: feeInvoices.dueDate,
          totalAmount: feeInvoices.totalAmount,
          amountPaid: feeInvoices.amountPaid,
        })
        .from(feeInvoices)
        .innerJoin(students, eq(feeInvoices.studentId, students.id))
        .innerJoin(guardians, eq(guardians.studentId, students.id))
        .where(and(
          eq(feeInvoices.status, 'overdue'),
          eq(guardians.smsOptOut, false),
        ))
        .limit(MAX_RECIPIENTS_PER_RULE);
      recipients = overdue.map((r) => ({
        recipientId: r.guardianId,
        recipientType: 'guardian' as const,
        phoneNumber: r.phone,
        message: renderMessage(template?.content || '', r.name, r.studentName, r.balance || '0', r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '', settings, r.totalAmount || '0', r.amountPaid || '0'),
        templateId: rule.templateId || undefined,
      }));
      break;
    }

    case 'feeDueSoon': {
      const soon = await db
        .select({
          guardianId: guardians.id,
          phone: guardians.phone,
          name: guardians.name,
          studentId: students.id,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          balance: feeInvoices.balance,
          dueDate: feeInvoices.dueDate,
          totalAmount: feeInvoices.totalAmount,
          amountPaid: feeInvoices.amountPaid,
        })
        .from(feeInvoices)
        .innerJoin(students, eq(feeInvoices.studentId, students.id))
        .innerJoin(guardians, eq(guardians.studentId, students.id))
        .where(and(
          eq(feeInvoices.status, 'unpaid'),
          sql`${feeInvoices.dueDate} BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
          eq(guardians.smsOptOut, false),
        ))
        .limit(MAX_RECIPIENTS_PER_RULE);
      recipients = soon.map((r) => ({
        recipientId: r.guardianId,
        recipientType: 'guardian' as const,
        phoneNumber: r.phone,
        message: renderMessage(template?.content || '', r.name, r.studentName, r.balance || '0', r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '', settings, r.totalAmount || '0', r.amountPaid || '0'),
        templateId: rule.templateId || undefined,
      }));
      break;
    }

    case 'lowAttendance': {
      const threshold = (rule.conditions as any)?.threshold || 3;
      const absences = await db
        .select({
          studentId: attendanceStudent.studentId,
          count: sql<number>`COUNT(*)`,
        })
        .from(attendanceStudent)
        .where(and(
          sql`${attendanceStudent.status} IN ('absent', 'late')`,
          sql`${attendanceStudent.date} >= NOW() - INTERVAL '30 days'`,
        ))
        .groupBy(attendanceStudent.studentId)
        .having(sql`COUNT(*) >= ${threshold}`);

      if (absences.length > 0) {
        const studentIds = absences.map((a) => a.studentId);
        const gs = await db
          .select({
            guardianId: guardians.id,
            phone: guardians.phone,
            name: guardians.name,
            studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
            studentId: students.id,
          })
          .from(guardians)
          .innerJoin(students, eq(guardians.studentId, students.id))
          .where(and(
            sql`${guardians.studentId} = ANY(${studentIds}::uuid[])`,
            eq(guardians.smsOptOut, false),
          ))
          .limit(MAX_RECIPIENTS_PER_RULE);
        recipients = gs.map((r) => ({
          recipientId: r.guardianId,
          recipientType: 'guardian' as const,
          phoneNumber: r.phone,
          message: renderMessage(template?.content || '', r.name, r.studentName, undefined, undefined, settings),
          templateId: rule.templateId || undefined,
        }));
      }
      break;
    }

    case 'resultPublished': {
      const published = await db
        .select({
          studentId: reportCards.studentId,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          guardianId: guardians.id,
          phone: guardians.phone,
          name: guardians.name,
        })
        .from(reportCards)
        .innerJoin(students, eq(reportCards.studentId, students.id))
        .innerJoin(guardians, eq(guardians.studentId, students.id))
        .where(and(
          sql`${reportCards.publishedAt} IS NOT NULL`,
          sql`${reportCards.publishedAt} >= NOW() - INTERVAL '1 hour'`,
          eq(guardians.smsOptOut, false),
        ))
        .limit(MAX_RECIPIENTS_PER_RULE);
      recipients = published.map((r) => ({
        recipientId: r.guardianId,
        recipientType: 'guardian' as const,
        phoneNumber: r.phone,
        message: renderMessage(template?.content || '', r.name, r.studentName, undefined, undefined, settings),
        templateId: rule.templateId || undefined,
      }));
      break;
    }

    case 'emergencyClosure': {
      const allGuardians = await db
        .select({
          guardianId: guardians.id,
          phone: guardians.phone,
          name: guardians.name,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
        })
        .from(guardians)
        .innerJoin(students, eq(guardians.studentId, students.id))
        .where(eq(guardians.smsOptOut, false))
        .limit(MAX_RECIPIENTS_PER_RULE);
      recipients = allGuardians.map((r) => ({
        recipientId: r.guardianId,
        recipientType: 'guardian' as const,
        phoneNumber: r.phone,
        message: renderMessage(template?.content || rule.name, r.name, r.studentName, undefined, undefined, settings),
        templateId: rule.templateId || undefined,
      }));
      break;
    }
  }

  if (recipients.length > 0) {
    const logs = await sendSmsMessages(recipients);
    await db.update(automatedSmsRules).set({ lastRunAt: new Date() }).where(eq(automatedSmsRules.id, rule.id));
    logger.info(`SMS rule "${rule.name}" sent ${logs.filter((l) => l.status === 'sent').length}/${logs.length} messages`);
  }
}

function renderMessage(content: string, guardianName: string, studentName: string, balance?: string, dueDate?: string, settings?: any, totalAmount?: string, amountPaid?: string): string {
  const term = settings?.currentTerm || 'Term 1';
  const year = settings?.currentAcademicYear || '2026';
  return content
    .replace(/{guardianName}/g, guardianName)
    .replace(/{studentName}/g, studentName || '')
    .replace(/{balance}/g, balance || '')
    .replace(/{dueDate}/g, dueDate || '')
    .replace(/{term}/g, term)
    .replace(/{currentTerm}/g, term)
    .replace(/{academicYear}/g, year)
    .replace(/{totalAmount}/g, totalAmount || '')
    .replace(/{amountPaid}/g, amountPaid || '');
}
