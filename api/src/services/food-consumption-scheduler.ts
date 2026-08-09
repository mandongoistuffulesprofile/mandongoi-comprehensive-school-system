import { db } from '../db';
import { mealTemplates, foodLogs, foodPresets, schoolSettings } from '../models/schema';
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

async function postToLedger(logType: string, itemName: string, estimatedValue: string, logId?: string) {
  const amount = Number(estimatedValue);
  if (amount <= 0) return;

  let debitCode: string = '5000';
  let creditCode: string = '1000';
  let sourceType: 'foodPurchase' | 'foodContribution' = 'foodPurchase';
  let description: string;

  if (logType === 'contribution') {
    debitCode = '5000'; creditCode = '6000';
    sourceType = 'foodContribution';
    description = `Food contribution received: ${itemName} KES ${amount}`;
  } else if (logType === 'collective' || logType === 'consumption') {
    debitCode = '5000'; creditCode = '1000';
    sourceType = 'foodPurchase';
    description = `Auto daily food consumption: ${itemName} KES ${amount}`;
  } else {
    return;
  }

  const [debitAcct] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, debitCode)).limit(1);
  const [creditAcct] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, creditCode)).limit(1);
  if (!debitAcct || !creditAcct) return;

  await postJournalEntry({
    entryDate: new Date(),
    description,
    sourceType,
    sourceId: logId || undefined,
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
        isActive: mealTemplates.isActive,
      })
      .from(mealTemplates)
      .innerJoin(foodPresets, eq(mealTemplates.presetId, foodPresets.id))
      .where(
        and(
          eq(mealTemplates.dayOfWeek, dayOfWeek as 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'),
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

    // Fetch collective food cost from school settings
    const [schoolCfg] = await db.select({ collectiveFoodCost: schoolSettings.collectiveFoodCost }).from(schoolSettings).limit(1);
    const collectiveCost = Number(schoolCfg?.collectiveFoodCost || 9000);

    // Distribute collective cost evenly across active meal slots for today
    const activeTemplates = templates.filter((t) => t.isActive);
    const perMealValue = activeTemplates.length > 0 ? String((collectiveCost / activeTemplates.length).toFixed(2)) : '0';

    let consumed = 0;
    for (const t of activeTemplates) {
      const qty = Number(t.fixedQuantity);

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
            estimatedValue: perMealValue,
            notes: `Auto: ${mealLabel[t.mealType as keyof typeof mealLabel]} — ${dateStr} — Collective cost`,
            term: t.term,
            academicYear: t.academicYear,
            loggedBy: null,
          })
          .returning();

        await updateStock(t.presetId, t.itemName, String(qty));
        consumed++;
      } catch (err) {
        logger.error('Food consumption auto-log failed', {
          error: err,
          templateId: t.id,
          itemName: t.itemName,
        });
      }
    }

    // Post a single journal entry for the collective food cost
    if (consumed > 0) {
      await postToLedger('collective', 'Daily Food Consumption', String(collectiveCost), `${dateStr}-consumption`);
    }

    logger.info(`Auto food consumption: ${consumed}/${activeTemplates.length} items logged for ${dayOfWeek} ${dateStr} (collective cost: KES ${collectiveCost})`);
  } catch (err) {
    logger.error('Food consumption scheduler error', { error: err });
  }
}
