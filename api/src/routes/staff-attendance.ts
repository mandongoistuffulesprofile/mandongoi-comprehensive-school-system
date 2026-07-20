import { Router } from 'express';
import { db } from '../db';
import { attendanceStaff } from '../models/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, date, status, sessionsTaught } = req.body;
    const [record] = await db.insert(attendanceStaff).values({
      staffId,
      date,
      status,
      sessionsTaught: sessionsTaught || 0,
    }).returning();
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

router.get('/staff/:staffId', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = [eq(attendanceStaff.staffId, req.params.staffId)];
    if (startDate) conditions.push(gte(attendanceStaff.date, startDate as any));
    if (endDate) conditions.push(lte(attendanceStaff.date, endDate as any));

    const data = await db.select().from(attendanceStaff)
      .where(and(...conditions))
      .orderBy(desc(attendanceStaff.date));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
