import { Router } from 'express';
import { db } from '../db';
import { payrollEntries, payrollRuns, staff, payrollAdjustments } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { applyAdjustment } from '../services/payroll';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/:runId/entries', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, baseRate, sessionsCounted, daysPresent } = req.body;
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.runId)).limit(1);
    if (!run) throw new AppError('Payroll run not found', 404);

    const grossPay = sessionsCounted ? Number(baseRate) * Number(sessionsCounted) : Number(baseRate);

    const [entry] = await db.insert(payrollEntries).values({
      payrollRunId: req.params.runId,
      staffId,
      baseRate: String(baseRate),
      sessionsCounted: sessionsCounted || null,
      daysPresent: daysPresent || null,
      grossPay: String(grossPay),
      netPay: String(grossPay),
    }).returning();
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

router.post('/:entryId/adjustments', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { reason, amount } = req.body;
    const adj = await applyAdjustment({
      entryId: req.params.entryId,
      reason,
      amount: Number(amount),
    });
    res.status(201).json({ success: true, data: adj });
  } catch (err) {
    next(err);
  }
});

router.get('/:entryId/adjustments', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(payrollAdjustments)
      .where(eq(payrollAdjustments.payrollEntryId, req.params.entryId))
      .orderBy(desc(payrollAdjustments.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/run/:runId', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(payrollEntries).where(eq(payrollEntries.payrollRunId, req.params.runId));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
