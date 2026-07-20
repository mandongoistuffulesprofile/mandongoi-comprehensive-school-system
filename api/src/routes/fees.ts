import { Router } from 'express';
import { db } from '../db';
import { feeStructures, feeInvoices } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { grade, term, academicYear, studentType } = req.query;
    const conditions = [];
    if (grade) conditions.push(eq(feeStructures.grade, grade as string));
    if (term) conditions.push(eq(feeStructures.term, Number(term)));
    if (academicYear) conditions.push(eq(feeStructures.academicYear, Number(academicYear)));
    if (studentType) conditions.push(eq(feeStructures.studentType, studentType as string));

    const data = await db.select().from(feeStructures)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(feeStructures.academicYear));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = {
      grade: req.body.grade, term: req.body.term, academicYear: req.body.academicYear,
      status: req.body.status || 'active',
      studentType: req.body.studentType || 'both',
      tuitionAmount: String(req.body.tuitionAmount || 0),
      activityAmount: String(req.body.activityAmount || 0),
      adminLevyAmount: String(req.body.adminLevyAmount || 0),
      boardingAmount: String(req.body.boardingAmount || 0),
      foodAmount: String(req.body.foodAmount || 0),
      totalAmount: String(req.body.totalAmount),
    };
    const [structure] = await db.insert(feeStructures).values(data).returning();
    res.status(201).json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = {
      grade: req.body.grade, term: req.body.term, academicYear: req.body.academicYear,
      status: req.body.status || 'active',
      studentType: req.body.studentType || 'both',
      tuitionAmount: String(req.body.tuitionAmount || 0),
      activityAmount: String(req.body.activityAmount || 0),
      adminLevyAmount: String(req.body.adminLevyAmount || 0),
      boardingAmount: String(req.body.boardingAmount || 0),
      foodAmount: String(req.body.foodAmount || 0),
      totalAmount: String(req.body.totalAmount),
    };
    const [structure] = await db.update(feeStructures).set(data).where(eq(feeStructures.id, req.params.id)).returning();
    if (!structure) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [existing] = await db
      .select({ id: feeInvoices.id })
      .from(feeInvoices)
      .where(eq(feeInvoices.feeStructureId, req.params.id))
      .limit(1);
    if (existing) {
      throw new AppError('Cannot delete this fee structure — it has existing invoices. Set status to "draft" instead to hide it.', 409);
    }
    await db.delete(feeStructures).where(eq(feeStructures.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
