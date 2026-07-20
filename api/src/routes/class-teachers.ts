import { Router } from 'express';
import { db } from '../db';
import { classTeachers, staff } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db
      .select({
        id: classTeachers.id,
        staffId: classTeachers.staffId,
        grade: classTeachers.grade,
        class: classTeachers.class,
        signatureUrl: classTeachers.signatureUrl,
        isActive: classTeachers.isActive,
        staffName: staff.name,
      })
      .from(classTeachers)
      .innerJoin(staff, eq(classTeachers.staffId, staff.id))
      .orderBy(classTeachers.grade);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/by-grade', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { grade } = req.query;
    if (!grade) return res.json({ success: true, data: null });
    const conditions = [eq(classTeachers.grade, grade as string), eq(classTeachers.isActive, true)];
    const [teacher] = await db
      .select({
        id: classTeachers.id,
        staffId: classTeachers.staffId,
        grade: classTeachers.grade,
        signatureUrl: classTeachers.signatureUrl,
        staffName: staff.name,
      })
      .from(classTeachers)
      .innerJoin(staff, eq(classTeachers.staffId, staff.id))
      .where(and(...conditions))
      .limit(1);
    res.json({ success: true, data: teacher || null });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, grade, class: className, signatureUrl, isActive } = req.body;
    const [existing] = await db
      .select({ id: classTeachers.id })
      .from(classTeachers)
      .where(and(
        eq(classTeachers.grade, grade),
        eq(classTeachers.class, className || null),
      ))
      .limit(1);
    if (existing) {
      throw new AppError(`A class teacher is already assigned to ${grade}${className ? ` Class ${className}` : ''}`, 409);
    }
    const [ct] = await db.insert(classTeachers).values({
      staffId, grade, class: className, signatureUrl: signatureUrl || null, isActive: isActive ?? true,
    }).returning();
    res.status(201).json({ success: true, data: ct });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, grade, class: className, signatureUrl, isActive } = req.body;
    const [conflict] = await db
      .select({ id: classTeachers.id })
      .from(classTeachers)
      .where(and(
        eq(classTeachers.grade, grade),
        eq(classTeachers.class, className || null),
      ))
      .limit(1);
    if (conflict && conflict.id !== req.params.id) {
      throw new AppError(`A class teacher is already assigned to ${grade}${className ? ` Class ${className}` : ''}`, 409);
    }
    const [ct] = await db.update(classTeachers)
      .set({ staffId, grade, class: className, signatureUrl: signatureUrl || null, isActive: isActive ?? true })
      .where(eq(classTeachers.id, req.params.id))
      .returning();
    if (!ct) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: ct });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(classTeachers).where(eq(classTeachers.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
