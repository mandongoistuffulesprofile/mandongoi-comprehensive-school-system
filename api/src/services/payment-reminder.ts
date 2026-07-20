import { db } from '../db';
import { schoolSettings, payrollRuns, notifications, users } from '../models/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export async function evaluatePaymentReminders() {
  try {
    const [settings] = await db.select().from(schoolSettings).limit(1);
    if (!settings || !settings.payDay) return;

    const payDay = settings.payDay;
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const daysUntilPay = payDay >= currentDay ? payDay - currentDay : (payDay + new Date(currentYear, currentMonth + 1, 0).getDate()) - currentDay;

    // Only trigger when pay day is within 3 days or is today
    if (daysUntilPay > 3) return;

    // Check if a payroll run already exists for this month (means it's been processed)
    const existingRun = await db
      .select()
      .from(payrollRuns)
      .where(and(
        eq(payrollRuns.month, currentMonth + 1),
        eq(payrollRuns.year, currentYear)
      ))
      .limit(1);

    const run = existingRun[0];

    // Check if we already sent a reminder today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const existingNotification = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.type, 'payroll'),
        gte(notifications.createdAt, todayStart),
        eq(notifications.role, 'schoolAdmin')
      ))
      .limit(1);

    if (existingNotification.length > 0) return;

    let title: string;
    let message: string;
    let link = '/payroll';

    if (daysUntilPay === 0) {
      // Pay day is today
      if (run) {
        if (run.status === 'draft') {
          title = 'Payroll Due Today — Needs Approval';
          message = `Today is pay day (day ${payDay}). The payroll for ${currentMonth + 1}/${currentYear} is in draft. Please review and approve, then mark as paid.`;
        } else if (run.status === 'approved') {
          title = 'Payroll Due Today — Mark as Paid';
          message = `Today is pay day (day ${payDay}). The payroll for ${currentMonth + 1}/${currentYear} is approved but not yet marked as paid. Process payment now.`;
        } else if (run.status === 'paid') {
          title = 'Payroll Processed ✓';
          message = `Payroll for ${currentMonth + 1}/${currentYear} has been marked as paid. No action needed.`;
          return; // Don't create a notification if already paid
        } else {
          return;
        }
      } else {
        title = 'Pay Day — No Payroll Run Found';
        message = `Today is pay day (day ${payDay}) but no payroll run exists for ${currentMonth + 1}/${currentYear}. Please create one.`;
      }
    } else {
      // Pay day is coming up
      if (run && run.status === 'paid') return; // Already paid

      title = `Payroll Reminder — ${daysUntilPay} Day${daysUntilPay > 1 ? 's' : ''} Until Pay Day`;
      message = `Pay day (day ${payDay}) is in ${daysUntilPay} day${daysUntilPay > 1 ? 's' : ''}. `;
      if (!run) {
        message += `No payroll run has been created for ${currentMonth + 1}/${currentYear} yet. Please prepare the payroll.`;
      } else if (run.status === 'draft') {
        message += `The payroll run is in draft. Please review and approve before pay day.`;
      } else if (run.status === 'approved') {
        message += `The payroll run is approved and ready to be marked as paid on pay day.`;
      }
    }

    // Create notification for all schoolAdmin users
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'schoolAdmin'));

    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        role: 'schoolAdmin',
        title,
        message,
        type: 'payroll',
        link,
      });
    }

    logger.info(`Payment reminder created: "${title}" for ${adminUsers.length} admin(s)`);
  } catch (err) {
    logger.error('Payment reminder evaluation error', { error: err });
  }
}
