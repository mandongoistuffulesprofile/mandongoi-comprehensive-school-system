import { Router } from 'express';
import { db } from '../db';
import { strands } from '../models/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/learning-area/:learningAreaId', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(strands).where(eq(strands.learningAreaId, req.params.learningAreaId));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { learningAreaId: req.body.learningAreaId, name: req.body.name };
    const [strand] = await db.insert(strands).values(data).returning();
    res.status(201).json({ success: true, data: strand });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { learningAreaId: req.body.learningAreaId, name: req.body.name };
    const [strand] = await db.update(strands).set(data).where(eq(strands.id, req.params.id)).returning();
    if (!strand) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: strand });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(strands).where(eq(strands.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
