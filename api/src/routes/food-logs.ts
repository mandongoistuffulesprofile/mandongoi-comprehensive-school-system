import { Router } from 'express';
import { db } from '../db';
import { foodLogs, foodPresets, students, ledgerAccounts } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { postJournalEntry } from '../services/ledger';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, term, academicYear, type } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (studentId) conditions.push(eq(foodLogs.studentId, studentId));
    if (term) conditions.push(eq(foodLogs.term, Number(term)));
    if (academicYear) conditions.push(eq(foodLogs.academicYear, Number(academicYear)));
    if (type) conditions.push(eq(foodLogs.type, type as any));

    const data = await db
      .select({
        id: foodLogs.id,
        studentId: foodLogs.studentId,
        presetId: foodLogs.presetId,
        itemName: foodLogs.itemName,
        type: foodLogs.type,
        quantity: foodLogs.quantity,
        unit: foodLogs.unit,
        estimatedValue: foodLogs.estimatedValue,
        loggedAt: foodLogs.loggedAt,
        notes: foodLogs.notes,
        term: foodLogs.term,
        academicYear: foodLogs.academicYear,
        studentName: sql`${students.firstName} || ' ' || ${students.lastName}`,
        studentGrade: students.grade,
      })
      .from(foodLogs)
      .leftJoin(students, eq(foodLogs.studentId, students.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(foodLogs.loggedAt));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

async function updateStock(presetId: string | undefined, itemName: string, quantity: string, logType: string) {
  const [preset] = await db.select().from(foodPresets).where(eq(foodPresets.itemName, itemName)).limit(1);
  if (!preset) return;

  const qty = Number(quantity);
  const delta = logType === 'purchase' || logType === 'contribution' ? qty : -qty;
  const newStock = Math.max(0, Number(preset.stockQuantity) + delta);
  await db.update(foodPresets)
    .set({ stockQuantity: String(newStock) })
    .where(eq(foodPresets.id, preset.id));
}

async function postToLedger(logType: string, itemName: string, estimatedValue: string, userId: string | undefined, logId: string) {
  const amount = Number(estimatedValue);
  if (amount <= 0) return;

  let debitCode: string, creditCode: string, sourceType: 'foodPurchase' | 'foodContribution', description: string;

  if (logType === 'purchase') {
    debitCode = '5000'; creditCode = '1000';
    sourceType = 'foodPurchase';
    description = `Food purchase: ${itemName} KES ${amount}`;
  } else if (logType === 'contribution') {
    debitCode = '5000'; creditCode = '6000';
    sourceType = 'foodContribution';
    description = `Food contribution received: ${itemName} KES ${amount}`;
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
    sourceId: logId,
    createdBy: userId,
    lines: [
      { accountId: debitAcct.id, debit: amount },
      { accountId: creditAcct.id, credit: amount },
    ],
  });
}

router.post('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, presetId, itemName, type, quantity, unit, notes, term, academicYear } = req.body;
    const logType = type || 'consumption';

    if (!itemName || !term || !academicYear) {
      return res.status(400).json({ success: false, error: 'itemName, term, and academicYear are required' });
    }

    if (logType === 'contribution' && !studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required for contribution logs' });
    }

    let estimatedValue = '0';
    let finalItemName = itemName;
    let finalUnit = unit || 'kg';

    if (presetId) {
      const [preset] = await db.select().from(foodPresets).where(eq(foodPresets.id, presetId)).limit(1);
      if (!preset) throw new AppError('Food preset not found', 404);
      finalItemName = preset.itemName;
      finalUnit = preset.unit;
      estimatedValue = String(Number(quantity || 1) * Number(preset.unitPrice));
    }

    const [log] = await db
      .insert(foodLogs)
      .values({
        studentId: studentId || null,
        presetId: presetId || null,
        itemName: finalItemName,
        type: logType,
        quantity: String(quantity || 1),
        unit: finalUnit,
        estimatedValue,
        notes: notes || null,
        term,
        academicYear,
        loggedBy: req.user?.id,
      })
      .returning();

    await updateStock(presetId || log.id, finalItemName, String(quantity || 1), logType);
    await postToLedger(logType, finalItemName, estimatedValue, req.user?.id, log.id);

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [existing] = await db.select().from(foodLogs).where(eq(foodLogs.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    await db.delete(foodLogs).where(eq(foodLogs.id, req.params.id));

    const reverseType = existing.type === 'purchase' || existing.type === 'contribution' ? 'consumption' : 'purchase';
    await updateStock(existing.presetId || undefined, existing.itemName, existing.quantity, reverseType);

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.get('/stock-summary', requireRole('schoolAdmin', 'teacher'), async (_req: AuthRequest, res, next) => {
  try {
    const data = await db
      .select()
      .from(foodPresets)
      .where(eq(foodPresets.isActive, true))
      .orderBy(foodPresets.itemName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
