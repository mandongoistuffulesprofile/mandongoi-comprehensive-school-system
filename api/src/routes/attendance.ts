import { Router } from 'express';
import { db } from '../db';
import { attendanceStudent } from '../models/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { requireRole, requireOwnStudent } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, date, status } = req.body;
    const existing = await db.select().from(attendanceStudent).where(and(eq(attendanceStudent.studentId, studentId), eq(attendanceStudent.date, date ? new Date(date as string) : new Date()))).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Attendance already recorded for this student on this date' });
    }
    const [record] = await db.insert(attendanceStudent).values({
      studentId,
      date: date ? new Date(date as string) : new Date(),
      status,
      markedBy: req.user!.id,
    }).returning();
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

router.get('/student/:studentId', requireRole('schoolAdmin', 'teacher', 'parent'), requireOwnStudent((r) => r.params.studentId), async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = [eq(attendanceStudent.studentId, req.params.studentId)];
    if (startDate) conditions.push(gte(attendanceStudent.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(attendanceStudent.date, new Date(endDate as string)));

    const data = await db.select().from(attendanceStudent)
      .where(and(...conditions))
      .orderBy(desc(attendanceStudent.date));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
