import { db } from '../db';
import { mealTemplates, foodLogs, foodPresets } from '../models/schema';
import { eq, and, sql, gte, lt } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { postJournalEntry } from './ledger';
import { ledgerAccounts } from '../models/schema';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

async function updateStock(presetId: string, itemName: string, quantity: string) {
  const [preset] = await db.select().from(foodPresets).where(eq(foodPresets.itemName, itemName)).limit(1);
  if (!preset) return;
  const qty = Number(quantity);
  const newStock = Math.max(0, Number(preset.stockQuantity) - qty);
  await db.update(foodPresets)
    .set({ stockQuantity: String(newStock) })
    .where(eq(foodPresets.id, preset.id));
}

async function postToLedger(itemName: string, estimatedValue: string, logId: string) {
  const amount = Number(estimatedValue);
  if (amount <= 0) return;

  const [debitAcct] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, '5000')).limit(1);
  const [creditAcct] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, '1000')).limit(1);
  if (!debitAcct || !creditAcct) return;

  await postJournalEntry({
    entryDate: new Date(),
    description: `Auto: Daily food consumption — ${itemName} KES ${amount}`,
    sourceType: 'foodPurchase',
    sourceId: logId,
    createdBy: undefined,
    lines: [
      { accountId: debitAcct.id, debit: amount },
      { accountId: creditAcct.id, credit: amount },
    ],
  });
}

function getTodayKenyan(): { dayOfWeek: string; dateStr: string } {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const kenyanHour = (now.getUTCHours() + 3) % 24;
  const kenyanDay = kenyanHour < now.getUTCHours() ? utcDay : utcDay;
  const dayIndex = now.getUTCHours() + 3 >= 24 ? (utcDay + 1) % 7 : utcDay;
  const dayOfWeek = DAYS[dayIndex];
  const localDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const dateStr = localDate.toISOString().split('T')[0];
  return { dayOfWeek, dateStr };
}

export async function runFoodConsumption(): Promise<void> {
  try {
    const { dayOfWeek, dateStr } = getTodayKenyan();

    const todayStart = new Date(`${dateStr}T00:00:00+03:00`);
    const todayEnd = new Date(`${dateStr}T23:59:59+03:00`);

    const [existingConsumption] = await db
      .select({ id: foodLogs.id })
      .from(foodLogs)
      .where(
        and(
          eq(foodLogs.type, 'consumption'),
          sql`${foodLogs.loggedAt} >= ${todayStart.toISOString()}`,
          sql`${foodLogs.loggedAt} <= ${todayEnd.toISOString()}`,
          sql`${foodLogs.notes} LIKE 'Auto:%'`
        )
      )
      .limit(1);

    if (existingConsumption) {
      return;
    }

    const templates = await db
      .select({
        id: mealTemplates.id,
        mealType: mealTemplates.mealType,
        presetId: mealTemplates.presetId,
        fixedQuantity: mealTemplates.fixedQuantity,
        term: mealTemplates.term,
        academicYear: mealTemplates.academicYear,
        itemName: foodPresets.itemName,
        unit: foodPresets.unit,
        unitPrice: foodPresets.unitPrice,
      })
      .from(mealTemplates)
      .innerJoin(foodPresets, eq(mealTemplates.presetId, foodPresets.id))
      .where(
        and(
          eq(mealTemplates.dayOfWeek, dayOfWeek),
          eq(mealTemplates.isActive, true)
        )
      );

    if (templates.length === 0) {
      return;
    }

    const mealLabel = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      supper: 'Supper',
    } as const;

    let consumed = 0;
    for (const t of templates) {
      const qty = Number(t.fixedQuantity);
      const price = Number(t.unitPrice);
      const estimatedValue = String(qty * price);

      try {
        const [log] = await db
          .insert(foodLogs)
          .values({
            studentId: null,
            presetId: t.presetId,
            itemName: t.itemName,
            type: 'consumption',
            quantity: String(qty),
            unit: t.unit,
            estimatedValue,
            notes: `Auto: ${mealLabel[t.mealType as keyof typeof mealLabel]} — ${dateStr}`,
            term: t.term,
            academicYear: t.academicYear,
            loggedBy: null,
          })
          .returning();

        await updateStock(t.presetId, t.itemName, String(qty));
        await postToLedger(t.itemName, estimatedValue, log.id);
        consumed++;
      } catch (err) {
        logger.error('Food consumption auto-log failed', {
          error: err,
          templateId: t.id,
          itemName: t.itemName,
        });
      }
    }

    logger.info(`Auto food consumption: ${consumed}/${templates.length} items logged for ${dayOfWeek} ${dateStr}`);
  } catch (err) {
    logger.error('Food consumption scheduler error', { error: err });
  }
}
