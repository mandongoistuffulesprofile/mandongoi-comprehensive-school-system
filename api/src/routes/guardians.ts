import { Router } from 'express';
import { db } from '../db';
import { guardians, students } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { parsePagination, paginatedResult } from '../utils/pagination';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, phone } = req.query;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const conditions = [];
    if (studentId) conditions.push(eq(guardians.studentId, studentId as string));
    if (phone) conditions.push(eq(guardians.phone, phone as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(guardians)
      .where(where);

    const data = await db.select().from(guardians)
      .where(where)
      .orderBy(desc(guardians.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({ success: true, ...paginatedResult(data, Number(count), page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, ...guardianData } = req.body;

    const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (student.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const [guardian] = await db.insert(guardians).values({
      studentId,
      ...guardianData,
    }).returning();

    res.status(201).json({ success: true, data: guardian });
  } catch (err) {
    next(err);
  }
});

router.get('/phone/:phone', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(guardians).where(eq(guardians.phone, req.params.phone));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
