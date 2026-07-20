import { Router } from 'express';
import { db } from '../db';
import { payrollRuns } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateRunEntries, postPayrollRunToLedger, calculateExtraDutyPayments } from '../services/payroll';
import { parsePagination, paginatedResult } from '../utils/pagination';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { status, month, year } = req.query;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const conditions = [];
    if (status) conditions.push(eq(payrollRuns.status, status as any));
    if (month) conditions.push(eq(payrollRuns.month, Number(month)));
    if (year) conditions.push(eq(payrollRuns.year, Number(year)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payrollRuns)
      .where(where);

    const data = await db.select().from(payrollRuns)
      .where(where)
      .orderBy(desc(payrollRuns.year), desc(payrollRuns.month))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({ success: true, ...paginatedResult(data, Number(count), page, limit) });
  } catch (err) {
    next(err);
  }
});
router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {

  try {
    const { month, year } = req.body;
    if (!month || !year) throw new AppError("month and year are required", 400);
    const [existing] = await db.select().from(payrollRuns)
      .where(and(eq(payrollRuns.month, month), eq(payrollRuns.year, year))).limit(1);
    if (existing) throw new AppError("Payroll run already exists for this month/year", 409);
    const [run] = await db.insert(payrollRuns).values({ month, year }).returning();
    res.status(201).json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/generate-entries', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const entries = await generateRunEntries({ runId: req.params.id });
    res.status(201).json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/extra-duty', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1);
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
    const data = await calculateExtraDutyPayments(run.month, run.year);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1);
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
    if (run.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Only draft runs can be approved' });
    }
    const [updated] = await db.update(payrollRuns).set({ status: 'approved', approvedBy: req.user!.id, approvedAt: new Date() }).where(eq(payrollRuns.id, req.params.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1);
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
    if (run.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Only draft runs can be deleted' });
    }
    await db.delete(payrollRuns).where(eq(payrollRuns.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/pay', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1);
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
    if (run.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Only approved runs can be paid' });
    }
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(payrollRuns).set({ status: 'paid', paidAt: new Date() }).where(eq(payrollRuns.id, req.params.id)).returning();
      await postPayrollRunToLedger({ runId: req.params.id, createdBy: req.user!.id }, tx);
      return updated;
    });
    const [paid] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1);
    res.json({ success: true, data: paid });
  } catch (err) {
    next(err);
  }
});

export default router;
