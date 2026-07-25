import { db } from '../db';
import { feeInvoices, students, notifications } from '../models/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { notify } from './notify';

export async function evaluateOverdueInvoices() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdues = await db
      .select({
        id: feeInvoices.id,
        studentId: feeInvoices.studentId,
        totalAmount: feeInvoices.totalAmount,
        balance: feeInvoices.balance,
        dueDate: feeInvoices.dueDate,
        term: feeInvoices.term,
        academicYear: feeInvoices.academicYear,
        firstName: students.firstName,
        lastName: students.lastName,
        grade: students.grade,
      })
      .from(feeInvoices)
      .innerJoin(students, eq(feeInvoices.studentId, students.id))
      .where(and(
        sql`${feeInvoices.balance} > 0`,
        sql`${feeInvoices.dueDate} < ${todayStart.toISOString()}`,
      ));

    if (overdues.length === 0) return;

    let notified = 0;
    for (const inv of overdues) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(
          eq(notifications.type, 'warning'),
          gte(notifications.createdAt, todayStart),
          eq(notifications.link, `/fees/invoices?studentId=${inv.studentId}`),
        ))
        .limit(1);

      if (existing) continue;

      await notify({
        title: `Overdue Invoice — ${inv.firstName} ${inv.lastName}`,
        message: `${inv.firstName} ${inv.lastName} (${inv.grade}) has an overdue balance of KES ${Number(inv.balance).toLocaleString()} — ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past due.`,
        type: 'warning',
        link: `/fees/invoices?studentId=${inv.studentId}`,
        roles: ['schoolAdmin', 'accountant'],
      });
      notified++;
    }

    if (notified > 0) {
      logger.info(`Overdue checker: ${notified} new notification(s) for ${overdues.length} overdue invoice(s)`);
    }
  } catch (err) {
    logger.error('Overdue invoice evaluation error', { error: err });
  }
}
