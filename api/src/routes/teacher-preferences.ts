import { Router } from 'express';
import { db } from '../db';
import { teacherPreferences, staff } from '../models/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(teacherPreferences);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/staff/:staffId', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const [pref] = await db.select().from(teacherPreferences).where(eq(teacherPreferences.staffId, req.params.staffId)).limit(1);
    res.json({ success: true, data: pref || null });
  } catch (err) { next(err); }
});

router.put('/staff/:staffId', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const existing = await db.select().from(teacherPreferences).where(eq(teacherPreferences.staffId, req.params.staffId)).limit(1);
    const data = {
      staffId: req.params.staffId,
      preferredGrade: req.body.preferredGrade || null,
      preferredClass: req.body.preferredClass || null,
      preferredLearningAreaId: req.body.preferredLearningAreaId || null,
      priority: req.body.priority || 5,
      updatedAt: new Date(),
    };
    let result;
    if (existing.length > 0) {
      [result] = await db.update(teacherPreferences).set(data).where(eq(teacherPreferences.staffId, req.params.staffId)).returning();
    } else {
      [result] = await db.insert(teacherPreferences).values(data).returning();
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
