import { Router } from 'express';
import { db } from '../db';
import { staff } from '../models/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { role, isActive, contractType } = req.query;
    const conditions = [];
    if (role) conditions.push(eq(staff.role, role as any));
    if (isActive !== undefined) conditions.push(eq(staff.isActive, isActive === 'true'));
    if (contractType) conditions.push(eq(staff.contractType, contractType as any));

    const data = await db.select().from(staff)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(staff.name);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/active-teachers', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(staff)
      .where(and(
        eq(staff.isActive, true),
        eq(staff.role, 'teacher'),
        sql`(CASE WHEN ${staff.contractEndDate} IS NOT NULL THEN ${staff.contractEndDate} >= CURRENT_DATE ELSE true END)`,
      ))
      .orderBy(staff.name);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      role: req.body.role,
      contractType: req.body.contractType || 'tsc_permanent',
      tscNumber: req.body.tscNumber || null,
      contractStartDate: req.body.contractStartDate ? new Date(req.body.contractStartDate) : null,
      contractEndDate: req.body.contractEndDate ? new Date(req.body.contractEndDate) : null,
      maxWeeklyLessons: req.body.maxWeeklyLessons || 30,
      teacherType: req.body.teacherType,
      employmentType: req.body.employmentType,
      baseRate: req.body.baseRate,
      extraSessionRate: req.body.extraSessionRate,
      subjects: req.body.subjects,
      payoutRef: req.body.payoutRef,
      isActive: req.body.isActive !== false,
    };
    const [member] = await db.insert(staff).values(data).returning();
    res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data: Record<string, any> = {};
    for (const k of ['name', 'phone', 'email', 'role', 'contractType', 'tscNumber', 'teacherType', 'employmentType', 'baseRate', 'extraSessionRate', 'subjects', 'payoutRef', 'isActive', 'maxWeeklyLessons']) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }
    if (req.body.contractStartDate) data.contractStartDate = new Date(req.body.contractStartDate);
    if (req.body.contractEndDate) data.contractEndDate = new Date(req.body.contractEndDate);
    const [member] = await db.update(staff).set(data).where(eq(staff.id, req.params.id)).returning();
    if (!member) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: member });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(staff).where(eq(staff.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
